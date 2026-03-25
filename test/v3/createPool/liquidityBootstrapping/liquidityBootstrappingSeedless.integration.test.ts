// pnpm test v3/createPool/liquidityBootstrapping/liquidityBootstrappingSeedless.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    TestActions,
    parseUnits,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    PERMIT2,
    InitPool,
    CreatePoolLiquidityBootstrappingInput,
    LBPParams,
    InitPoolInput,
    CreatePool,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import { PublicWalletClient } from '@/utils';
import {
    vaultExtensionAbi_V3,
    liquidityBootstrappingPoolAbi_V3,
    lBPoolFactoryAbi_V3Extended,
} from 'src/abi/';
import { assertInitPool } from 'test/lib/utils/initPoolHelper';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
    sendTransactionGetBalances,
} from 'test/lib/utils/helper';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { findEventInReceiptLogs } from 'test/lib/utils/findEventInReceiptLogs';

const protocolVersion = 3;
const chainId = ChainId.MAINNET;
const poolType = PoolType.LiquidityBootstrapping;
const BAL = TOKENS[chainId].BAL;
const USDC = TOKENS[chainId].USDC;
const saleStart = BigInt(Math.floor(Date.now() / 1000) + 86400);
const saleEnd = BigInt(Math.floor(Date.now() / 1000) + 691200);

describe('create seedless liquidityBootstrapping pool test', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let poolAddress: Address;
    let seedlessEventArgs: {
        blockProjectTokenSwapsIn: boolean;
        hasMigration: boolean;
        isSeedless: boolean;
    };

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.MAINNET,
            undefined,
            24049200n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        const lbpParams: LBPParams = {
            owner: testAddress,
            projectToken: BAL.address,
            reserveToken: USDC.address,
            startTimestamp: saleStart,
            endTimestamp: saleEnd,
            blockProjectTokenSwapsIn: true,
            projectTokenStartWeight: parseEther('0.5'),
            reserveTokenStartWeight: parseEther('0.5'),
            projectTokenEndWeight: parseEther('0.3'),
            reserveTokenEndWeight: parseEther('0.7'),
            reserveTokenVirtualBalance: parseUnits('1000', USDC.decimals),
        };

        const createPoolInput: CreatePoolLiquidityBootstrappingInput = {
            protocolVersion,
            swapFeePercentage: parseUnits('0.01', 18),
            lbpParams,
            symbol: 'LBP',
            chainId,
            poolType: PoolType.LiquidityBootstrapping,
            poolCreator: testAddress,
        };

        const createPool = new CreatePool();
        const { callData, to } = createPool.buildCall(createPoolInput);

        const hash = await client.sendTransaction({
            to,
            data: callData,
            account: testAddress,
            chain: client.chain,
        });

        const transactionReceipt = await client.waitForTransactionReceipt({
            hash,
        });

        const poolCreatedEvent = findEventInReceiptLogs({
            receipt: transactionReceipt,
            eventName: 'PoolCreated',
            abi: lBPoolFactoryAbi_V3Extended,
            to,
        });
        poolAddress = poolCreatedEvent.args.pool as Address;

        const weightedLBPoolCreatedEvent = findEventInReceiptLogs({
            receipt: transactionReceipt,
            eventName: 'WeightedLBPoolCreated',
            abi: lBPoolFactoryAbi_V3Extended,
            to,
        });
        seedlessEventArgs = weightedLBPoolCreatedEvent.args;
    }, 120_000);

    test('Deployment', async () => {
        expect(poolAddress).to.not.be.undefined;
    }, 120_000);

    test('Seedless flag', async () => {
        expect(seedlessEventArgs.isSeedless).to.be.true;
        expect(seedlessEventArgs.blockProjectTokenSwapsIn).to.be.true;
        expect(seedlessEventArgs.hasMigration).to.be.false;
    }, 120_000);

    test('Registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: AddressProvider.Vault(chainId),
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    }, 120_000);

    test('Initialization', async () => {
        await setTokenBalances(
            client,
            testAddress,
            [BAL.address],
            [BAL.slot!],
            [parseUnits('100', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [BAL.address],
            PERMIT2[chainId],
        );

        await approveTokens(
            client,
            testAddress,
            [BAL.address],
            protocolVersion,
        );

        // BAL listed before USDC (reverse of Vault sort order: USDC=0, BAL=1)
        // to verify that buildCall resolves amounts by address, not array position.
        const initPoolInput: InitPoolInput = {
            minBptAmountOut: 0n,
            amountsIn: [
                {
                    address: BAL.address,
                    rawAmount: parseUnits('33', BAL.decimals),
                    decimals: BAL.decimals,
                },
                {
                    address: USDC.address,
                    rawAmount: 0n,
                    decimals: USDC.decimals,
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
                { ...USDC, index: 0 },
                { ...BAL, index: 1 },
            ],
        });

        const txOutput = await sendTransactionGetBalances(
            [BAL.address, USDC.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);

    test('Virtual reserve balance', async () => {
        const [virtualBalanceRaw, virtualBalanceScaled18] =
            await client.readContract({
                address: poolAddress,
                abi: liquidityBootstrappingPoolAbi_V3,
                functionName: 'getReserveTokenVirtualBalance',
            });

        expect(virtualBalanceRaw).to.equal(parseUnits('1000', USDC.decimals));
        expect(virtualBalanceScaled18).to.equal(parseUnits('1000', 18));
    }, 120_000);
});
