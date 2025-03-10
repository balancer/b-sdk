// pnpm test -- v3/createPool/liquidityBoostrapping/liquidityBootstrapping.integration.test.ts
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
    Permit2Helper,
    PERMIT2,
    InitPool,
    CreatePoolLiquidityBootstrappingInput,
    LBPParams,
    VAULT_V3,
    InitPoolInput,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import { doCreatePool } from '../../../lib/utils/createPoolHelper';
import { TOKENS } from 'test/lib/utils/addresses';
import { PublicWalletClient } from '@/utils';
import { vaultExtensionAbi_V3 } from 'src/abi/';
import { assertInitPool } from 'test/lib/utils/initPoolHelper';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    sendTransactionGetBalances,
} from 'test/lib/utils/helper';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.Weighted;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('create liquidityBootstrapping pool test', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolLiquidityBootstrappingInput;
    let lbpParams: LBPParams;
    let poolAddress: Address;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            7783363n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        lbpParams = {
            owner: testAddress,
            projectToken: BAL.address,
            reserveToken: WETH.address,
            projectTokenStartWeight: parseEther('0.5'),
            reserveTokenStartWeight: parseEther('0.5'),
            projectTokenEndWeight: parseEther('0.3'),
            reserveTokenEndWeight: parseEther('0.7'),
            startTime: BigInt(Math.floor(Date.now() / 1000) + 86400), // now + 1 day
            endTime: BigInt(Math.floor(Date.now() / 1000) + 691200), // now + 8 days
            blockProjectTokenSwapsIn: true,
        };

        createPoolInput = {
            protocolVersion: protocolVersion,
            swapFeePercentage: parseUnits('0.01', 18),
            lbpParams: lbpParams,
            symbol: 'LBP',
            chainId: chainId,
            poolType: PoolType.LiquidityBootstrapping,
        };

        poolAddress = await doCreatePool({
            client,
            createPoolInput,
            testAddress,
        });
    }, 120_000);
    test('Deployment', async () => {
        expect(poolAddress).to.not.be.undefined;
    }, 120_000);
    test('Registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: VAULT_V3[chainId],
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
        const permit2 = await Permit2Helper.signInitPoolApproval({
            ...initPoolInput,
            client,
            owner: testAddress,
        });

        const initPoolBuildOutput = initPool.buildCallWithPermit2(
            initPoolInput,
            {
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
            },
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [WETH.address, BAL.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );
        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);
});
