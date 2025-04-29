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
    Hex,
    parseAbi,
    erc4626Abi,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    PoolState,
    CreatePoolReClammInput,
    InitPool,
    Permit2Helper,
    PERMIT2,
    balancerV3Contracts,
    vaultExtensionAbi_V3,
    PublicWalletClient,
    InitPoolDataProvider,
    calculateReClammInitAmounts,
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
const WETH = TOKENS[chainId].WETH;
const stataUSDC = TOKENS[chainId].stataUSDC;
const stataUSDCRateProvider = '0x34101091673238545de8a846621823d9993c3085';
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;
const USDC = TOKENS[chainId].USDC_AAVE;

describe('ReClamm', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createWethStataUsdcPoolInput: CreatePoolReClammInput;
    let createBalDaiPoolInput: CreatePoolReClammInput;
    let wethStataUsdcPoolAddress: Address;
    let balDaiPoolAddress: Address;
    let wethUsdcPoolState: PoolState;
    let balDaiPoolState: PoolState;
    let snapshot: Hex;
    let stataUSDCRate: bigint;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8193333n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        // fetch token rates
        stataUSDCRate = await client.readContract({
            address: stataUSDCRateProvider,
            abi: parseAbi(['function getRate() view returns (uint256)']),
            functionName: 'getRate',
        });

        // set erc20 token balances with slots
        await setTokenBalances(
            client,
            testAddress,
            [stataUSDC.address, WETH.address, DAI.address, BAL.address],
            [stataUSDC.slot!, WETH.slot!, DAI.slot!, BAL.slot!],
            [
                parseUnits('1000', stataUSDC.decimals),
                parseUnits('1000', WETH.decimals),
                parseUnits('1000', DAI.decimals),
                parseUnits('1000', BAL.decimals),
            ],
        );

        // must call deposit to get erc4626 balances
        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDC.address],
            stataUSDC.address,
        );
        const hash = await client.writeContract({
            account: testAddress,
            chain: CHAINS[chainId],
            abi: erc4626Abi,
            address: stataUSDC.address,
            functionName: 'deposit',
            args: [parseUnits('1000', USDC.decimals), testAddress],
        });

        // wait for deposit confirmation before starting tests
        await client.waitForTransactionReceipt({
            hash,
        });

        await approveSpenderOnTokens(
            client,
            testAddress,
            [stataUSDC.address, WETH.address, DAI.address, BAL.address],
            PERMIT2[chainId],
        );

        createWethStataUsdcPoolInput = {
            poolType,
            symbol: 'WETH-stataUSDC',
            tokens: [
                {
                    address: WETH.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: stataUSDC.address,
                    rateProvider: stataUSDCRateProvider,
                    tokenType: TokenType.TOKEN_WITH_RATE,
                    paysYieldFees: true,
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

        createBalDaiPoolInput = {
            ...createWethStataUsdcPoolInput,
            symbol: 'BAL-DAI',
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
        };

        wethStataUsdcPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createWethStataUsdcPoolInput,
        });

        balDaiPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createBalDaiPoolInput,
        });

        // Get pool state
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        wethUsdcPoolState = await initPoolDataProvider.getInitPoolData(
            wethStataUsdcPoolAddress,
            poolType,
            protocolVersion,
        );

        balDaiPoolState = await initPoolDataProvider.getInitPoolData(
            balDaiPoolAddress,
            poolType,
            protocolVersion,
        );

        // Take a snapshot after pool creation
        snapshot = await client.snapshot();
    }, 120_000);

    beforeEach(async () => {
        // Revert to the snapshot before each test
        await client.revert({
            id: snapshot,
        });
        // Take a new snapshot for the next test
        snapshot = await client.snapshot();
    });

    describe('pool create', () => {
        test('pool should be created', async () => {
            expect(wethStataUsdcPoolAddress).to.not.be.undefined;
        });

        test('pool should be registered with Vault', async () => {
            const isPoolRegistered = await client.readContract({
                address: balancerV3Contracts.Vault[chainId],
                abi: vaultExtensionAbi_V3,
                functionName: 'isPoolRegistered',
                args: [wethStataUsdcPoolAddress],
            });
            expect(isPoolRegistered).to.be.true;
        });
    });

    describe('pool init', () => {
        describe('with diff decimals and rates', async () => {
            test('18 decimal token given in', async () => {
                // user chooses an amount for one of the tokens
                const givenAmountIn = {
                    address: WETH.address,
                    rawAmount: parseUnits('0.1', WETH.decimals),
                    decimals: WETH.decimals,
                };

                // moving tokens to describe block for DRY causes stataUSDCRate undefined
                const tokens = [
                    {
                        address: WETH.address,
                        index: 0,
                        decimals: WETH.decimals,
                    },
                    {
                        address: stataUSDC.address,
                        index: 1,
                        decimals: stataUSDC.decimals,
                        rate: stataUSDCRate,
                    },
                ];

                // helper calculates the amount for the other token
                const amountsIn = await calculateReClammInitAmounts({
                    ...createWethStataUsdcPoolInput,
                    tokens,
                    givenAmountIn,
                });

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
                    wethUsdcPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [WETH.address, stataUSDC.address],
                    client,
                    testAddress,
                    initPoolBuildOutput.to,
                    initPoolBuildOutput.callData,
                    initPoolBuildOutput.value,
                );

                assertInitPool(initPoolInput, {
                    txOutput,
                    initPoolBuildOutput,
                });
            }, 120_000);

            test('6 decimal token with rate given in', async () => {
                // user chooses an amount for one of the tokens
                const givenAmountIn = {
                    address: stataUSDC.address,
                    rawAmount: parseUnits('10', stataUSDC.decimals),
                    decimals: stataUSDC.decimals,
                };

                // moving tokens to describe block for DRY causes stataUSDCRate undefined
                const tokens = [
                    {
                        address: WETH.address,
                        index: 0,
                        decimals: WETH.decimals,
                    },
                    {
                        address: stataUSDC.address,
                        index: 1,
                        decimals: stataUSDC.decimals,
                        rate: stataUSDCRate,
                    },
                ];

                // helper calculates the amount for the other token
                const amountsIn = await calculateReClammInitAmounts({
                    ...createWethStataUsdcPoolInput,
                    tokens,
                    givenAmountIn,
                });

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
                    wethUsdcPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [WETH.address, stataUSDC.address],
                    client,
                    testAddress,
                    initPoolBuildOutput.to,
                    initPoolBuildOutput.callData,
                    initPoolBuildOutput.value,
                );

                assertInitPool(initPoolInput, {
                    txOutput,
                    initPoolBuildOutput,
                });
            }, 120_000);
        });

        describe('with two 18 decimal tokens no rates', () => {
            test('token A given in', async () => {
                // user chooses an amount for one of the tokens
                const givenAmountIn = {
                    address: BAL.address,
                    rawAmount: parseUnits('1', BAL.decimals),
                    decimals: BAL.decimals,
                };

                // helper calculates the amount for the other token
                const amountsIn = await calculateReClammInitAmounts({
                    ...createBalDaiPoolInput,
                    tokens: balDaiPoolState.tokens,
                    givenAmountIn,
                });

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
                    balDaiPoolState,
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

                assertInitPool(initPoolInput, {
                    txOutput,
                    initPoolBuildOutput,
                });
            }, 120_000);

            test('token B given in', async () => {
                // user chooses an amount for one of the tokens
                const givenAmountIn = {
                    address: DAI.address,
                    rawAmount: parseUnits('1', DAI.decimals),
                    decimals: DAI.decimals,
                };

                // helper calculates the amount for the other token
                const amountsIn = await calculateReClammInitAmounts({
                    ...createBalDaiPoolInput,
                    tokens: balDaiPoolState.tokens,
                    givenAmountIn,
                });

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
                    balDaiPoolState,
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

                assertInitPool(initPoolInput, {
                    txOutput,
                    initPoolBuildOutput,
                });
            }, 120_000);
        }, 120_000);

        // TODO: init pool where both tokens have rates?
    });
});
