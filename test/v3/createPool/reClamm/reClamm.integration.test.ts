// pnpm test v3/createPool/reClamm/reClamm.integration.test.ts
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
    computeReClammInitAmounts,
    MinimalTokenWithRate,
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
// erc20
const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI_AAVE;
const USDC = TOKENS[chainId].USDC_AAVE;
// erc4626
const stataUSDC = TOKENS[chainId].stataUSDC;
const stataUSDCRateProvider = '0x34101091673238545de8a846621823d9993c3085';
const stataDAI = TOKENS[chainId].stataDAI;
const stataDAIRateProvider = '0x22db61f3a8d81d3d427a157fdae8c7eb5b5fd373';

describe('ReClamm', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let snapshot: Hex;

    // BAL-DAI pool
    let createBalDaiPoolInput: CreatePoolReClammInput;
    let balDaiPoolAddress: Address;
    let balDaiPoolState: PoolState;
    // WETH-stataUSDC pool
    let createWethStataUsdcPoolInput: CreatePoolReClammInput;
    let wethStataUsdcPoolAddress: Address;
    let wethStataUsdcPoolState: PoolState;
    let wethStataUsdcPoolTokens: MinimalTokenWithRate[];
    // stataUSDC-stataDAI pool
    let createStataDaiStataUsdcPoolInput: CreatePoolReClammInput;
    let stataDaiStataUsdcPoolAddress: Address;
    let stataDaiStataUsdcPoolState: PoolState;
    let stataDaiStataUSDCPoolTokens: MinimalTokenWithRate[];
    // rates
    let stataUsdcRate: bigint;
    let stataDaiRate: bigint;

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
        stataUsdcRate = await client.readContract({
            address: stataUSDCRateProvider,
            abi: parseAbi(['function getRate() view returns (uint256)']),
            functionName: 'getRate',
        });
        stataDaiRate = await client.readContract({
            address: stataDAIRateProvider,
            abi: parseAbi(['function getRate() view returns (uint256)']),
            functionName: 'getRate',
        });
        // set erc20 token balances with slots
        await setTokenBalances(
            client,
            testAddress,
            [USDC.address, WETH.address, DAI.address, BAL.address],
            [USDC.slot!, WETH.slot!, DAI.slot!, BAL.slot!],
            [
                parseUnits('10000', USDC.decimals),
                parseUnits('10000', WETH.decimals),
                parseUnits('10000', DAI.decimals),
                parseUnits('10000', BAL.decimals),
            ],
        );

        // must call deposit to get erc4626 balances
        await approveSpenderOnTokens(
            client,
            testAddress,
            [DAI.address],
            stataDAI.address,
        );
        const depositDaiHash = await client.writeContract({
            account: testAddress,
            chain: CHAINS[chainId],
            abi: erc4626Abi,
            address: stataDAI.address,
            functionName: 'deposit',
            args: [parseUnits('10', DAI.decimals), testAddress],
        });
        await client.waitForTransactionReceipt({
            hash: depositDaiHash,
        }); // wait for deposit confirmation before starting tests
        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDC.address],
            stataUSDC.address,
        );
        const depositUsdcHash = await client.writeContract({
            account: testAddress,
            chain: CHAINS[chainId],
            abi: erc4626Abi,
            address: stataUSDC.address,
            functionName: 'deposit',
            args: [parseUnits('1000', USDC.decimals), testAddress],
        });
        await client.waitForTransactionReceipt({
            hash: depositUsdcHash,
        }); // wait for deposit confirmation before starting tests

        await approveSpenderOnTokens(
            client,
            testAddress,
            [
                WETH.address,
                USDC.address,
                DAI.address,
                BAL.address,
                stataUSDC.address,
                stataDAI.address,
            ],
            PERMIT2[chainId],
        );

        const baseReClammInput = {
            poolType: PoolType.ReClamm as const,
            swapFeePercentage: parseUnits('0.01', 18),
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            initialMinPrice: parseUnits('0.5', 18),
            initialMaxPrice: parseUnits('8', 18),
            initialTargetPrice: parseUnits('3', 18),
            priceShiftDailyRate: parseUnits('1', 18),
            centerednessMargin: parseUnits('0.2', 18),
            chainId,
            protocolVersion: 3 as const,
        };

        createBalDaiPoolInput = {
            ...baseReClammInput,
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

        createWethStataUsdcPoolInput = {
            ...baseReClammInput,
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
        };
        wethStataUsdcPoolTokens = [
            {
                address: WETH.address,
                index: 0,
                decimals: WETH.decimals,
            },
            {
                address: stataUSDC.address,
                index: 1,
                decimals: stataUSDC.decimals,
                rate: stataUsdcRate,
            },
        ];

        createStataDaiStataUsdcPoolInput = {
            ...baseReClammInput,
            symbol: 'stataUSDC-stataDAI',
            tokens: [
                {
                    address: stataDAI.address,
                    rateProvider: stataDAIRateProvider,
                    tokenType: TokenType.TOKEN_WITH_RATE,
                    paysYieldFees: true,
                },
                {
                    address: stataUSDC.address,
                    rateProvider: stataUSDCRateProvider,
                    tokenType: TokenType.TOKEN_WITH_RATE,
                    paysYieldFees: true,
                },
            ],
        };
        stataDaiStataUSDCPoolTokens = [
            {
                address: stataUSDC.address,
                index: 0,
                decimals: stataUSDC.decimals,
                rate: stataUsdcRate,
            },
            {
                address: stataDAI.address,
                index: 1,
                decimals: stataDAI.decimals,
                rate: stataDaiRate,
            },
        ];

        balDaiPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createBalDaiPoolInput,
        });

        wethStataUsdcPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createWethStataUsdcPoolInput,
        });

        stataDaiStataUsdcPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: createStataDaiStataUsdcPoolInput,
        });

        // Get pool state
        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        wethStataUsdcPoolState = await initPoolDataProvider.getInitPoolData(
            wethStataUsdcPoolAddress,
            poolType,
            protocolVersion,
        );

        balDaiPoolState = await initPoolDataProvider.getInitPoolData(
            balDaiPoolAddress,
            poolType,
            protocolVersion,
        );

        stataDaiStataUsdcPoolState = await initPoolDataProvider.getInitPoolData(
            stataDaiStataUsdcPoolAddress,
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
            expect(stataDaiStataUsdcPoolAddress).to.not.be.undefined;
        });

        test('pool should be registered with Vault', async () => {
            const isPoolRegistered = await client.readContract({
                address: balancerV3Contracts.Vault[chainId],
                abi: vaultExtensionAbi_V3,
                functionName: 'isPoolRegistered',
                args: [stataDaiStataUsdcPoolAddress],
            });
            expect(isPoolRegistered).to.be.true;
        });
    });

    describe('pool init', () => {
        describe('with zero tokens having a rate', () => {
            test('reference: 18 decimal token A', async () => {
                // user chooses an amount for one of the tokens
                const referenceAmountIn = {
                    address: BAL.address,
                    rawAmount: parseUnits('10', BAL.decimals),
                    decimals: BAL.decimals,
                };

                // helper calculates the amount for the other token
                const amountsIn = await computeReClammInitAmounts({
                    ...createBalDaiPoolInput,
                    tokens: balDaiPoolState.tokens,
                    referenceAmountIn: referenceAmountIn,
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

            test('reference: 18 decimal token B', async () => {
                // user chooses an amount for one of the tokens
                const referenceAmountIn = {
                    address: DAI.address,
                    rawAmount: parseUnits('10', DAI.decimals),
                    decimals: DAI.decimals,
                };

                // helper calculates the amount for the other token
                const amountsIn = await computeReClammInitAmounts({
                    ...createBalDaiPoolInput,
                    tokens: balDaiPoolState.tokens,
                    referenceAmountIn: referenceAmountIn,
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
                    [DAI.address, BAL.address],
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

        describe('with one token having a rate', async () => {
            test('reference: 18 decimal token with no rate', async () => {
                // user chooses an amount for one of the tokens
                const referenceAmountIn = {
                    address: WETH.address,
                    rawAmount: parseUnits('0.1', WETH.decimals),
                    decimals: WETH.decimals,
                };

                // helper calculates the amount for the other token
                const amountsIn = await computeReClammInitAmounts({
                    ...createWethStataUsdcPoolInput,
                    tokens: wethStataUsdcPoolTokens,
                    referenceAmountIn,
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
                    wethStataUsdcPoolState,
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

            test('reference: 6 decimal token with rate', async () => {
                // user chooses an amount for one of the tokens
                const referenceAmountIn = {
                    address: stataUSDC.address,
                    rawAmount: parseUnits('10', stataUSDC.decimals),
                    decimals: stataUSDC.decimals,
                };

                // helper calculates the amount for the other token
                const amountsIn = await computeReClammInitAmounts({
                    ...createWethStataUsdcPoolInput,
                    tokens: wethStataUsdcPoolTokens,
                    referenceAmountIn,
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
                    wethStataUsdcPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [stataUSDC.address, WETH.address],
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

        describe('with both tokens having rates', () => {
            test('reference: 18 decimal token with rate', async () => {
                const referenceAmountIn = {
                    address: stataDAI.address,
                    rawAmount: parseUnits('1', stataDAI.decimals), // reverts if changed from 1 to 10?
                    decimals: stataDAI.decimals,
                };

                // helper calculates the amount for the other token
                const amountsIn = await computeReClammInitAmounts({
                    ...createStataDaiStataUsdcPoolInput,
                    tokens: stataDaiStataUSDCPoolTokens,
                    referenceAmountIn,
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
                    stataDaiStataUsdcPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [stataDAI.address, stataUSDC.address],
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
            });

            test('reference: 6 decimal token with rate', async () => {
                const referenceAmountIn = {
                    address: stataUSDC.address,
                    rawAmount: parseUnits('1', stataUSDC.decimals), // reverts if changed from 1 to 10
                    decimals: stataUSDC.decimals,
                };
                // helper calculates the amount for the other token
                const amountsIn = await computeReClammInitAmounts({
                    ...createStataDaiStataUsdcPoolInput,
                    tokens: stataDaiStataUSDCPoolTokens,
                    referenceAmountIn,
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
                    stataDaiStataUsdcPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [stataUSDC.address, stataDAI.address],
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
            });
        });
    });
});
