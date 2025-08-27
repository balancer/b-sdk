// pnpm test -- v3/createPool/liquidityBootstrapping/liquidityBootstrapping.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    TestActions,
    parseUnits,
    erc20Abi,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    Permit2Helper,
    PERMIT2,
    InitPool,
    CreatePoolLiquidityBootstrappingInput,
    LBPParams,
    InitPoolInput,
    MigratePool,
    // balancerV3Contracts,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { TOKENS } from 'test/lib/utils/addresses';
import { MAX_UINT256, PublicWalletClient } from '@/utils';
import {
    migrationRouter_V3,
    vaultExtensionAbi_V3,
    weightedPoolFactoryAbiExtended_V3,
} from 'src/abi/';
import { assertInitPool } from 'test/lib/utils/initPoolHelper';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
    sendTransactionGetBalances,
} from 'test/lib/utils/helper';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    CreatePoolLiquidityBootstrappingWithMigrationInput,
    LBPMigrationParams,
} from '../../../../src/entities/createPool/types';
import {
    MigratePoolLiquidityBootstrappingInput,
    WeightedPoolParams,
    MigratePoolWithdrawBPTInput,
} from '../../../../src/entities/migratePool/types';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';
import { MigratePoolLiquidityBootstrapping } from '@/entities/migratePool/liquidityBootstrapping';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.LiquidityBootstrapping;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const bptLockDurationInSeconds = 1n; // no lock for test simplicity
const saleStart = BigInt(Math.floor(Date.now() / 1000) + 86400); // now + 1 day
const saleEnd = BigInt(Math.floor(Date.now() / 1000) + 691200); // now + 8 days

describe('create liquidityBootstrapping pool test', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolLiquidityBootstrappingInput;
    let createPoolWithMigrationInput: CreatePoolLiquidityBootstrappingWithMigrationInput;
    let lbpMigrationParams: LBPMigrationParams;
    let lbpParams: LBPParams;
    let poolAddress: Address;
    let poolWithMigrationAddress: Address;
    let migratePoolInput: MigratePoolLiquidityBootstrappingInput;
    let migratePool: MigratePool;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8715886n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        migratePool = new MigratePool();

        lbpParams = {
            owner: testAddress,
            projectToken: BAL.address,
            reserveToken: WETH.address,
            projectTokenStartWeight: parseEther('0.5'),
            reserveTokenStartWeight: parseEther('0.5'),
            projectTokenEndWeight: parseEther('0.3'),
            reserveTokenEndWeight: parseEther('0.7'),
            startTimestamp: saleStart,
            endTimestamp: saleEnd,
            blockProjectTokenSwapsIn: true,
        };

        createPoolInput = {
            protocolVersion: protocolVersion,
            swapFeePercentage: parseUnits('0.01', 18),
            lbpParams: lbpParams,
            symbol: 'LBP',
            chainId: chainId,
            poolType: PoolType.LiquidityBootstrapping,
            poolCreator: testAddress,
        };

        lbpMigrationParams = {
            bptLockDurationinSeconds: bptLockDurationInSeconds,
            bptPercentageToMigrate: parseEther('0.5'),
            migrationWeightProjectToken: parseEther('0.5'),
            migrationWeightReserveToken: parseEther('0.5'),
        };

        createPoolWithMigrationInput = {
            ...createPoolInput,
            lbpMigrationParams,
        };

        poolAddress = await doCreatePool({
            client,
            createPoolInput,
            testAddress,
        });

        poolWithMigrationAddress = await doCreatePool({
            client,
            createPoolInput: createPoolWithMigrationInput,
            testAddress,
        });
    }, 120_000);
    test('Deployment', async () => {
        expect(poolAddress).to.not.be.undefined;
        expect(poolWithMigrationAddress).to.not.be.undefined;
    }, 120_000);
    test('Registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: AddressProvider.Vault(chainId),
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        const isPoolWithMigrationRegistered = await client.readContract({
            address: AddressProvider.Vault(chainId),
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolWithMigrationAddress],
        });
        expect(isPoolRegistered).to.be.true;
        expect(isPoolWithMigrationRegistered).to.be.true;
    }, 120_000);
    test('Initialization', async () => {
        await setTokenBalances(
            client,
            testAddress,
            [WETH.address, BAL.address],
            [WETH.slot!, BAL.slot!],
            [parseUnits('100', 18), parseUnits('100', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [WETH.address, BAL.address],
            PERMIT2[chainId],
        );

        await approveTokens(
            client,
            testAddress,
            [WETH.address, BAL.address],
            protocolVersion,
        );
        const initPoolInput: InitPoolInput = {
            minBptAmountOut: 0n,
            amountsIn: [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('2', WETH.decimals),
                    decimals: WETH.decimals,
                },
                {
                    address: BAL.address,
                    rawAmount: parseUnits('33', BAL.decimals),
                    decimals: BAL.decimals,
                },
            ],
            chainId,
            wethIsEth: false,
        };

        const initPool = new InitPool();

        const initPoolBuildOutput = initPool.buildCall(initPoolInput, {
            id: poolAddress,
            address: poolAddress,
            type: poolType,
            protocolVersion: 3,
            tokens: [
                {
                    ...WETH,
                    index: 0,
                },
                {
                    ...BAL,
                    index: 1,
                },
            ],
        });

        const initPoolWithMigrationBuildOutput = initPool.buildCall(
            initPoolInput,
            {
                id: poolWithMigrationAddress,
                address: poolWithMigrationAddress,
                type: poolType,
                protocolVersion: 3,
                tokens: [
                    {
                        ...WETH,
                        index: 0,
                    },
                    {
                        ...BAL,
                        index: 1,
                    },
                ],
            },
        );

        const txOutput = await sendTransactionGetBalances(
            [WETH.address, BAL.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );
        const txWithMigrationOutput = await sendTransactionGetBalances(
            [WETH.address, BAL.address],
            client,
            testAddress,
            initPoolWithMigrationBuildOutput.to,
            initPoolWithMigrationBuildOutput.callData,
            initPoolWithMigrationBuildOutput.value,
        );
        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
        assertInitPool(initPoolInput, {
            txOutput: txWithMigrationOutput,
            initPoolBuildOutput: initPoolWithMigrationBuildOutput,
        });
    }, 120_000);
    test('Migration', async () => {
        // migrate the BPT to a weighted pool now.
        // this can only happen after the sale has ended
        const weightedPoolParams: WeightedPoolParams = {
            name: 'Migrated Pool',
            symbol: 'MP',
            pauseManager: '0x0000000000000000000000000000000000000000',
            swapFeeManager: '0x0000000000000000000000000000000000000000',
            swapFeePercentage: parseUnits('0.01', 18),
            poolHooksContract: '0x0000000000000000000000000000000000000000',
            enableDonation: false,
            disableUnbalancedLiquidity: false,
        };
        migratePoolInput = {
            poolType: PoolType.LiquidityBootstrapping,
            pool: poolWithMigrationAddress,
            chainid: chainId,
            rpcUrl: rpcUrl,
            excessReceiver: testAddress,
            weightedPoolParams: weightedPoolParams,
        };

        const migratePoolBuildCallOutput =
            migratePool.buildCall(migratePoolInput);

        // value not available as the migratePool function is not payable
        // jump forward in time to have the sale ended
        await client.setNextBlockTimestamp({
            timestamp: saleEnd + 1n,
        });
        await client.mine({
            blocks: 1,
        });

        // approve the Router to spend BPT
        await client.writeContract({
            address: poolWithMigrationAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [AddressProvider.LBPoolMigrationRouter(chainId), MAX_UINT256],
            chain: client.chain,
            account: testAddress,
        });

        // create the new weighted pool and migrate liquidity
        const txOutput = await sendTransactionGetBalances(
            [WETH.address, BAL.address, poolWithMigrationAddress],
            client,
            testAddress,
            migratePoolBuildCallOutput.to,
            migratePoolBuildCallOutput.callData,
        );

        // extract the address of the created weighted pool from the transaction receipt
        const {
            args: { pool: newWeightedPoolAddress },
        } = findEventInReceiptLogs({
            receipt: txOutput.transactionReceipt,
            eventName: 'PoolCreated',
            abi: weightedPoolFactoryAbiExtended_V3,
            to: AddressProvider.WeightedPoolFactory(chainId),
        });

        expect(txOutput.balanceDeltas[0]).toBeGreaterThan(0n); // WETH
        expect(txOutput.balanceDeltas[1]).toBeGreaterThan(0n); // BAL
        expect(txOutput.balanceDeltas[2]).toBeGreaterThan(0n); // LBP BPT

        // The weighted pool BPT token is still locked.
        const id = await client.readContract({
            address: AddressProvider.LBPoolMigrationRouter(chainId),
            abi: migrationRouter_V3,
            functionName: 'getId',
            args: [newWeightedPoolAddress],
        });

        const unlockTime = await client.readContract({
            address: AddressProvider.LBPoolMigrationRouter(chainId),
            abi: migrationRouter_V3,
            functionName: 'getUnlockTimestamp',
            args: [id],
        });

        // eventually unlock the time-locked BPT
        const unlockBPTInput: MigratePoolWithdrawBPTInput = {
            poolType: PoolType.LiquidityBootstrapping,
            pool: newWeightedPoolAddress,
            chainid: chainId,
            rpcUrl: rpcUrl,
        };

        await client.increaseTime({
            seconds: Number(bptLockDurationInSeconds) + 100,
        });
        await client.mine({ blocks: 1 });
        expect((await client.getBlock()).timestamp).to.be.greaterThan(
            Number(unlockTime),
        );

        const migratePoolLiquidityBootstrapping =
            new MigratePoolLiquidityBootstrapping();
        const unlockBPTOutput =
            migratePoolLiquidityBootstrapping.buildCallWithdrawBPT(
                unlockBPTInput,
            );

        const txOutputFromWithdrawl = await sendTransactionGetBalances(
            [newWeightedPoolAddress],
            client,
            testAddress,
            unlockBPTOutput.to,
            unlockBPTOutput.callData,
        );

        // BPT balances for the testAddress have changed.
        expect(txOutputFromWithdrawl.balanceDeltas[0]).toBeGreaterThan(0n);
    }, 120_000);
});
