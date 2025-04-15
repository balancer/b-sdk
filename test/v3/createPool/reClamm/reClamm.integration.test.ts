// pnpm test -- v3/createPool/reClamm/reClamm.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
    parseUnits,
    TestActions,
    parseAbi,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    CreatePoolReClammInput,
    InitPool,
    Permit2Helper,
    PERMIT2,
    balancerV3Contracts,
    vaultExtensionAbi_V3,
    PublicWalletClient,
    InitPoolDataProvider,
    type InputAmount,
    type PoolState,
    fpMulDown,
    fpDivDown,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import {
    doCreatePool,
    TOKENS,
    assertInitPool,
    setTokenBalances,
    approveSpenderOnTokens,
    sendTransactionGetBalances,
} from '../../../lib/utils';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.ReClamm;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;

describe('ReClamm - create & init', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolReClammInput;
    let poolAddress: Address;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8123669n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        await setTokenBalances(
            client,
            testAddress,
            [DAI.address, BAL.address],
            [DAI.slot!, BAL.slot!],
            [parseUnits('1000', 18), parseUnits('1000', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [DAI.address, BAL.address],
            PERMIT2[chainId],
        );

        createPoolInput = {
            poolType,
            name: 'ReClamm Bal Dai',
            symbol: '50BAL-50DAI',
            tokens: [
                {
                    address: BAL.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: DAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: parseUnits('0.01', 18),
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            initialMinPrice: parseUnits('0.5', 18),
            initialMaxPrice: parseUnits('8', 18),
            initialTargetPrice: parseUnits('3', 18),
            priceShiftDailyRate: parseUnits('1', 18),
            centerednessMargin: parseUnits('0.2', 18),
            chainId,
            protocolVersion,
        };

        poolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput,
        });
    }, 120_000);

    test('pool should be created', async () => {
        expect(poolAddress).to.not.be.undefined;
    });

    test('pool should be registered with Vault', async () => {
        const isPoolRegistered = await client.readContract({
            address: balancerV3Contracts.Vault[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('pool should init', async () => {
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        const poolState = await initPoolDataProvider.getInitPoolData(
            poolAddress,
            poolType,
            protocolVersion,
        );

        ///// start of special reclamm init logic /////

        // User chooses an amount for one of the tokens
        const givenAmountIn = {
            address: BAL.address,
            rawAmount: parseUnits('100', BAL.decimals),
            decimals: BAL.decimals,
        };

        // SDK calculates the amount for the other token
        const amountsIn = await calculateInitReClammAmountsIn(
            poolState,
            givenAmountIn,
        );

        async function calculateInitReClammAmountsIn(
            poolState: PoolState,
            givenAmountIn: InputAmount,
        ): Promise<InputAmount[]> {
            // fetch proportion value from pool contract
            const proportion = await client.readContract({
                address: poolState.address,
                abi: parseAbi([
                    'function computeInitialBalanceRatio() external view returns (uint256 balanceRatio)',
                ]),
                functionName: 'computeInitialBalanceRatio',
                args: [],
            });

            // poolState reads on chain so always has tokens in vault sorted order right?
            const { tokens } = poolState;
            const givenTokenIndex = tokens.findIndex(
                (t) =>
                    t.address.toLowerCase() ===
                    givenAmountIn.address.toLowerCase(),
            );

            let calculatedAmountIn: InputAmount;

            // https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammPool.test.ts#L120-L128
            if (givenTokenIndex === 0) {
                // if chosen token is first in sort order, we multiply
                calculatedAmountIn = {
                    address: tokens[1].address,
                    rawAmount: fpMulDown(givenAmountIn.rawAmount, proportion),
                    decimals: tokens[1].decimals,
                };
            } else {
                // if chosen token is second in sort order, we divide
                calculatedAmountIn = {
                    address: tokens[0].address,
                    rawAmount: fpDivDown(givenAmountIn.rawAmount, proportion),
                    decimals: tokens[0].decimals,
                };
            }

            // Return amounts in consistent order based on token addresses
            return [givenAmountIn, calculatedAmountIn].sort((a, b) =>
                a.address.localeCompare(b.address),
            );
        }
        ///// end of special reclamm init logic /////

        const initPoolInput = {
            amountsIn,
            minBptAmountOut: 0n,
            chainId,
        };

        const permit2 = await Permit2Helper.signInitPoolApproval({
            ...initPoolInput,
            client,
            owner: testAddress,
        });

        const initPool = new InitPool();
        const initPoolBuildOutput = initPool.buildCallWithPermit2(
            initPoolInput,
            poolState,
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [BAL.address, DAI.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);
});
