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
    vaultExtensionAbi_V3,
    PublicWalletClient,
    InitPoolDataProvider,
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
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.ReClamm;
// erc20
const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI_AAVE;
const USDC = TOKENS[chainId].USDC_AAVE;
// erc4626
const stataUSDCRateProvider = '0x34101091673238545de8a846621823d9993c3085';
const stataDAIRateProvider = '0x22db61f3a8d81d3d427a157fdae8c7eb5b5fd373';

const reclammPoolAbi = parseAbi([
    'function computeInitialBalancesRaw(address, uint256) view returns (uint256[])',
]);

describe('ReClamm', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let snapshot: Hex;

    // BAL-DAI pool
    let standardPoolInput: CreatePoolReClammInput;
    let standardPoolAddress: Address;
    let standardPoolState: PoolState;
    // WETH-stataUSDC pool
    let semiBoostedPoolInput: CreatePoolReClammInput;
    let semiBoostedPoolAddress: Address;
    let semiBoostedPoolState: PoolState;
    // stataUSDC-stataDAI pool
    let fullyBoostedPoolInput: CreatePoolReClammInput;
    let fullyBoostedPoolAddress: Address;
    let fullyBoostedPoolState: PoolState;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8525279n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

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

        await approveSpenderOnTokens(
            client,
            testAddress,
            [WETH.address, USDC.address, DAI.address, BAL.address],
            PERMIT2[chainId],
        );

        const baseReClammInput = {
            poolType: PoolType.ReClamm as const,
            swapFeePercentage: parseUnits('0.01', 18),
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            priceShiftDailyRate: parseUnits('1', 18),
            centerednessMargin: parseUnits('0.2', 18),
            chainId,
            protocolVersion: 3 as const,
        };

        standardPoolInput = {
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
            priceParams: {
                initialMinPrice: parseUnits('0.5', 18),
                initialMaxPrice: parseUnits('3', 18),
                initialTargetPrice: parseUnits('2.5', 18),
                tokenAPriceIncludesRate: false,
                tokenBPriceIncludesRate: false,
            },
        };

        semiBoostedPoolInput = {
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
                    address: USDC.address,
                    rateProvider: stataUSDCRateProvider,
                    tokenType: TokenType.TOKEN_WITH_RATE,
                    paysYieldFees: true,
                },
            ],
            priceParams: {
                initialMinPrice: parseUnits('1500', 18),
                initialMaxPrice: parseUnits('2500', 18),
                initialTargetPrice: parseUnits('2200', 18),
                tokenAPriceIncludesRate: false,
                tokenBPriceIncludesRate: true,
            },
        };

        fullyBoostedPoolInput = {
            ...baseReClammInput,
            symbol: 'stataUSDC-stataDAI',
            tokens: [
                {
                    address: USDC.address,
                    rateProvider: stataUSDCRateProvider,
                    tokenType: TokenType.TOKEN_WITH_RATE,
                    paysYieldFees: true,
                },
                {
                    address: DAI.address,
                    rateProvider: stataDAIRateProvider,
                    tokenType: TokenType.TOKEN_WITH_RATE,
                    paysYieldFees: true,
                },
            ],
            priceParams: {
                initialMinPrice: parseUnits('0.8', 18),
                initialMaxPrice: parseUnits('1.2', 18),
                initialTargetPrice: parseUnits('1.0', 18),
                tokenAPriceIncludesRate: true,
                tokenBPriceIncludesRate: true,
            },
        };

        standardPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: standardPoolInput,
        });
        semiBoostedPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: semiBoostedPoolInput,
        });
        fullyBoostedPoolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput: fullyBoostedPoolInput,
        });

        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        standardPoolState = await initPoolDataProvider.getInitPoolData(
            standardPoolAddress,
            poolType,
            protocolVersion,
        );
        semiBoostedPoolState = await initPoolDataProvider.getInitPoolData(
            semiBoostedPoolAddress,
            poolType,
            protocolVersion,
        );
        fullyBoostedPoolState = await initPoolDataProvider.getInitPoolData(
            fullyBoostedPoolAddress,
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

    describe('creation', () => {
        test('address exists', async () => {
            expect(fullyBoostedPoolAddress).to.not.be.undefined;
        });

        test('pool is registered with Vault', async () => {
            const isPoolRegistered = await client.readContract({
                address: AddressProvider.Vault(chainId),
                abi: vaultExtensionAbi_V3,
                functionName: 'isPoolRegistered',
                args: [fullyBoostedPoolAddress],
            });
            expect(isPoolRegistered).to.be.true;
        });
    });

    describe('initialization', () => {
        describe('with zero tokens having a rate', () => {
            test('reference: 18 decimal token A', async () => {
                const initAmountsRaw = await client.readContract({
                    address: standardPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [BAL.address, parseUnits('1', BAL.decimals)],
                });

                const amountsIn = standardPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    standardPoolState,
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
                const initAmountsRaw = await client.readContract({
                    address: standardPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [DAI.address, parseUnits('1', DAI.decimals)],
                });

                const amountsIn = standardPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    standardPoolState,
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

        describe('with one token having a rate', async () => {
            test('reference: 18 decimal token without rate', async () => {
                const initAmountsRaw = await client.readContract({
                    address: semiBoostedPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [WETH.address, parseUnits('1', WETH.decimals)],
                });

                const amountsIn = semiBoostedPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    semiBoostedPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [WETH.address, USDC.address],
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
                const initAmountsRaw = await client.readContract({
                    address: semiBoostedPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [USDC.address, parseUnits('1', USDC.decimals)],
                });

                const amountsIn = semiBoostedPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    semiBoostedPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [WETH.address, USDC.address],
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

        describe('pool with both tokens having rates', () => {
            test('reference token: 18 decimals with rate', async () => {
                const initAmountsRaw = await client.readContract({
                    address: fullyBoostedPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [DAI.address, parseUnits('1', DAI.decimals)],
                });

                const amountsIn = fullyBoostedPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    fullyBoostedPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [USDC.address, DAI.address],
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

            test('reference token: 6 decimals with rate', async () => {
                const initAmountsRaw = await client.readContract({
                    address: fullyBoostedPoolAddress,
                    abi: reclammPoolAbi,
                    functionName: 'computeInitialBalancesRaw',
                    args: [USDC.address, parseUnits('1', USDC.decimals)],
                });

                const amountsIn = fullyBoostedPoolState.tokens.map(
                    (token, index) => ({
                        address: token.address,
                        rawAmount: initAmountsRaw[index],
                        decimals: token.decimals,
                    }),
                );

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
                    fullyBoostedPoolState,
                    permit2,
                );

                const txOutput = await sendTransactionGetBalances(
                    [USDC.address, DAI.address],
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
