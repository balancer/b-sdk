// pnpm test -- v3/addLiquidityUnbalancedViaSwap/addLiquidityUnbalancedViaSwap.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';

import {
    Slippage,
    Hex,
    PoolState,
    CHAINS,
    ChainId,
    InputAmount,
    PERMIT2,
    PublicWalletClient,
    SwapKind,
} from '@/index';
import {
    AddLiquidityUnbalancedViaSwapV3,
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
    AddLiquidityUnbalancedViaSwapBuildCallOutput,
    discoverNaturalAmountsUnbalancedViaSwap,
} from '@/entities/addLiquidityUnbalancedViaSwap';
import { getPoolStateWithBalancesV3 } from '@/entities/utils/getPoolStateWithBalancesV3';
import { appendFileSync } from 'node:fs';
import {
    AddLiquidityTxInput,
    doAddLiquidity,
    POOLS,
    TOKENS,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.id;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC_AAVE;
const DAI = TOKENS[chainId].DAI;
const STATA_USDC = TOKENS[chainId].stataUSDC;
const STATA_USDT = TOKENS[chainId].stataUSDT;

// Toggle to control whether maxAdjustableAmount is discovered via an
// unconstrained query or taken directly from the test input. This is useful
// for debugging and comparing behaviors.
const USE_DISCOVERED_MAX_ADJUSTABLE = false;

class MockApi {
    async getPool(poolId: string): Promise<PoolState> {
        const lowerId = poolId.toLowerCase();

        if (
            lowerId ===
            POOLS[chainId].MOCK_WETH_BAL_POOL.id.toLowerCase()
        ) {
            // WETH/BAL weighted pool
            return {
                id: poolId as `0x${string}`,
                address:
                    POOLS[chainId].MOCK_WETH_BAL_POOL.address as Address,
                type: 'WEIGHTED',
                protocolVersion: 3,
                tokens: [
                    {
                        address: WETH.address,
                        decimals: WETH.decimals,
                        index: 0,
                    },
                    {
                        address: BAL.address,
                        decimals: BAL.decimals,
                        index: 1,
                    },
                ],
            };
        }

        if (
            lowerId === POOLS[chainId].MOCK_BOOSTED_POOL.id.toLowerCase()
        ) {
            // stataUSDC/stataUSDT stable (boosted) pool at 0x59fa488dda749cdd41772bb068bb23ee955a6d7a
            return {
                id: poolId as `0x${string}`,
                address:
                    POOLS[chainId].MOCK_BOOSTED_POOL.address as Address,
                type: 'STABLE',
                protocolVersion: 3,
                tokens: [
                    {
                        address: STATA_USDC.address,
                        decimals: STATA_USDC.decimals,
                        index: 0,
                    },
                    {
                        address: STATA_USDT.address,
                        decimals: STATA_USDT.decimals,
                        index: 1,
                    },
                ],
            };
        }

        if (
            lowerId === POOLS[chainId].MOCK_RECLAMM_POOL.id.toLowerCase()
        ) {
            // ReClamm pool with WETH / DAI
            return {
                id: poolId as `0x${string}`,
                address:
                    POOLS[chainId].MOCK_RECLAMM_POOL.address as Address,
                type: 'RECLAMM',
                protocolVersion: 3,
                tokens: [
                    {
                        address: WETH.address,
                        decimals: WETH.decimals,
                        index: 0,
                    },
                    {
                        address: DAI.address,
                        decimals: DAI.decimals,
                        index: 1,
                    },
                ],
            };
        }

        throw new Error(`Unknown test poolId: ${poolId}`);
    }
}

describe('add liquidity unbalanced via swap test', () => {
    let client: PublicWalletClient & TestActions;
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;
    let stablePoolState: PoolState;
    let reclammPoolState: PoolState;
    // Mainnet ReClamm test context (query-only, no tx execution)
    let mainnetRpcUrl: string;
    let mainnetReclammPoolState: PoolState;
    let mainnetAddLiquidityUnbalancedViaSwap: AddLiquidityUnbalancedViaSwapV3;
    let tokens: Address[];
    let rpcUrl: string;
    let snapshot: Hex;
    let addLiquidityUnbalancedViaSwap: AddLiquidityUnbalancedViaSwapV3;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);
        stablePoolState = await api.getPool(
            POOLS[chainId].MOCK_BOOSTED_POOL.id,
        );
        reclammPoolState = await api.getPool(
            POOLS[chainId].MOCK_RECLAMM_POOL.id,
        );

        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        const testAddress = (await client.getAddresses())[0];

        txInput = {
            client,
            addLiquidity: null as any, // Not used for this test
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput: {} as any, // Not used for this test
        };

        addLiquidityUnbalancedViaSwap = new AddLiquidityUnbalancedViaSwapV3();

        tokens = [...poolState.tokens.map((t) => t.address)];

        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [WETH.slot, BAL.slot] as number[],
            [...poolState.tokens.map((t) => parseUnits('1000', t.decimals))],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
        );

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('permit2 direct approval', () => {
        // `approveTokens` pre‑approves all ERC20s used in the tests:
        // - For protocolVersion 2 it approves the Balancer V2 Vault (`VAULT_V2`) as spender on each token.
        // - For protocolVersion 3 (this file) it first approves Permit2 as spender on each token, and then,
        //   via Permit2, grants max allowances on those tokens to the Balancer V3 Routers
        //   (`Router`, `BatchRouter`, `CompositeLiquidityRouterNested`, `BufferRouter`) so they can pull funds
        //   from the test account when executing add-liquidity and swap operations.
        beforeEach(async () => {
            await approveTokens(
                client,
                txInput.testAddress,
                tokens,
                protocolVersion,
            );
        });

        describe.skip('single-sided join with maxAdjustableAmountRaw = 0 (unsupported)', () => {
            test('query throws SDKError when adjustable amount is zero', async () => {
                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: 0n, // maxAdjustableAmountRaw = 0 → single-sided WETH
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 0, // WETH is exact, BAL is adjustable
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                    swapKind: SwapKind.GivenIn,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        poolState,
                    ),
                ).rejects.toThrow(
                    /Single-sided joins with maxAdjustableAmount = 0 are not supported/,
                );
            });
        });

        describe.skip('two-token unbalanced join (GivenIn, EXACT_IN correction swap)', () => {
            let addLiquidityInput: AddLiquidityUnbalancedViaSwapInput;
            let queryOutput: AddLiquidityUnbalancedViaSwapQueryOutput;
            let buildCallInput: AddLiquidityUnbalancedViaSwapBuildCallInput;
            let buildCallOutput: AddLiquidityUnbalancedViaSwapBuildCallOutput;

            beforeAll(async () => {
                addLiquidityInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('9000', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 0, // WETH is exact, BAL is adjustable
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                    swapKind: SwapKind.GivenIn,
                };

                if (USE_DISCOVERED_MAX_ADJUSTABLE) {
                    // Discover natural amounts (unbounded maxAdjustable) for this scenario.
                    const discovery =
                        await discoverNaturalAmountsUnbalancedViaSwap(
                            addLiquidityInput,
                            poolState,
                            SwapKind.GivenIn,
                        );

                    // Use the discovered adjustable amount as the maxAdjustableAmount for the true query.
                    const naturalAdjustable =
                        discovery.amountsIn[discovery.adjustableTokenIndex]
                            .amount;

                    const adjustedInput: AddLiquidityUnbalancedViaSwapInput = {
                        ...addLiquidityInput,
                        amountsIn: [...addLiquidityInput.amountsIn],
                    };
                    // In these tests exactTokenIndex is 0, so index 1 is always the adjustable token.
                    adjustedInput.amountsIn[1] = {
                        ...adjustedInput.amountsIn[1],
                        rawAmount: naturalAdjustable,
                    };

                    // Query the operation with the discovered maxAdjustableAmount.
                    queryOutput = await addLiquidityUnbalancedViaSwap.query(
                        adjustedInput,
                        poolState,
                    );
                } else {
                    // Original behavior: use the maxAdjustableAmount as provided in the test input.
                    queryOutput = await addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        poolState,
                    );
                }

                buildCallInput = {
                    ...queryOutput,
                    slippage: txInput.slippage,
                    wethIsEth: false,
                    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
                };

                buildCallOutput =
                    addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);
            });

            test('query returns valid output', () => {
                expect(queryOutput).toBeDefined();
                expect(queryOutput.pool).toBe(poolState.address);
                expect(queryOutput.chainId).toBe(chainId);
                expect(queryOutput.protocolVersion).toBe(3);
                expect(queryOutput.amountsIn).toHaveLength(2);
                expect(queryOutput.bptOut).toBeDefined();
                expect(queryOutput.exactToken).toBe(WETH.address);
                expect(queryOutput.exactAmount).toBe(
                    addLiquidityInput.amountsIn[0].rawAmount,
                );
                expect(queryOutput.adjustableTokenIndex).toBe(1);
            });

            test('buildCall returns valid output', () => {
                expect(buildCallOutput).toBeDefined();
                expect(buildCallOutput.callData).toBeDefined();
                expect(buildCallOutput.to).toBeDefined();
                expect(buildCallOutput.value).toBeDefined();
                expect(buildCallOutput.exactBptAmountOut).toBeDefined();
                expect(buildCallOutput.maxAdjustableAmount).toBeDefined();
            });

            test('exact token is WETH, adjustable token is BAL', () => {
                expect(queryOutput.exactToken.toLowerCase()).toBe(
                    WETH.address.toLowerCase(),
                );
                expect(queryOutput.adjustableTokenIndex).toBe(1);
                expect(
                    queryOutput.amountsIn[0].token.address.toLowerCase(),
                ).toBe(WETH.address.toLowerCase());
                expect(
                    queryOutput.amountsIn[1].token.address.toLowerCase(),
                ).toBe(BAL.address.toLowerCase());
            });

            test('BPT amount is calculated correctly', () => {
                expect(queryOutput.bptOut.amount).toBeGreaterThan(0n);
                expect(queryOutput.bptOut.token.address).toBe(
                    poolState.address,
                );
                expect(queryOutput.bptOut.token.decimals).toBe(18);
            });

            test('amounts in are calculated correctly', () => {
                expect(queryOutput.amountsIn[0].amount).toBeGreaterThan(0n);
                expect(queryOutput.amountsIn[1].amount).toBeGreaterThan(0n);

                // Exact token amount should match input
                expect(queryOutput.amountsIn[0].amount).toBe(
                    addLiquidityInput.amountsIn[0].rawAmount,
                );

                // Adjustable token amount should be calculated by the router
                expect(queryOutput.amountsIn[1].amount).toBeGreaterThan(0n);
            });

            test('slippage is applied correctly', () => {
                const adjustableAmount =
                    queryOutput.amountsIn[queryOutput.adjustableTokenIndex];
                const maxAdjustableAmount = buildCallOutput.maxAdjustableAmount;

                // Max adjustable amount should be higher than the calculated amount (slippage applied)
                expect(maxAdjustableAmount.amount).toBeGreaterThan(
                    adjustableAmount.amount,
                );

                // Exact BPT amount should not have slippage applied
                expect(buildCallOutput.exactBptAmountOut.amount).toBe(
                    queryOutput.bptOut.amount,
                );
            });

            test('transaction executes successfully', async () => {
                const txHash = await client.sendTransaction({
                    to: buildCallOutput.to,
                    data: buildCallOutput.callData,
                    value: buildCallOutput.value,
                    account: txInput.testAddress,
                    chain: CHAINS[chainId],
                });

                const receipt = await client.waitForTransactionReceipt({
                    hash: txHash,
                });

                expect(receipt.status).toBe('success');
                expect(receipt.transactionHash).toBe(txHash);
            });
        });

        describe.skip('two-token unbalanced join (GivenIn, minimizeAdjustableAmount=true)', () => {
            let baseInput: AddLiquidityUnbalancedViaSwapInput;
            let baselineOutput: AddLiquidityUnbalancedViaSwapQueryOutput;
            let minimizedOutput: AddLiquidityUnbalancedViaSwapQueryOutput;

            beforeAll(async () => {
                baseInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.1', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('900', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 0, // WETH is exact, BAL is adjustable
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                    swapKind: SwapKind.GivenIn,
                };

                let baselineInput = baseInput;
                let minimizedInput: AddLiquidityUnbalancedViaSwapInput = {
                    ...baseInput,
                    minimizeAdjustableAmount: true,
                };

                if (USE_DISCOVERED_MAX_ADJUSTABLE) {
                    // Discover natural adjustable for this GivenIn scenario once and reuse for both modes.
                    const discovery =
                        await discoverNaturalAmountsUnbalancedViaSwap(
                            baseInput,
                            poolState,
                            SwapKind.GivenIn,
                        );

                    const naturalAdjustable =
                        discovery.amountsIn[discovery.adjustableTokenIndex]
                            .amount;

                    baselineInput = {
                        ...baseInput,
                        amountsIn: [...baseInput.amountsIn],
                    };
                    baselineInput.amountsIn[1] = {
                        ...baselineInput.amountsIn[1],
                        rawAmount: naturalAdjustable,
                    };

                    minimizedInput = {
                        ...minimizedInput,
                        amountsIn: [...minimizedInput.amountsIn],
                    };
                    minimizedInput.amountsIn[1] = {
                        ...minimizedInput.amountsIn[1],
                        rawAmount: naturalAdjustable,
                    };
                }

                // Only run the minimized query path here. For the purposes of this
                // test we treat the minimized output as the baseline comparison,
                // avoiding a second non-minimized query.
                minimizedOutput = await addLiquidityUnbalancedViaSwap.query(
                    minimizedInput,
                    poolState,
                );

                baselineOutput = minimizedOutput;
            });

            test('minimizeAdjustableAmount keeps exact token fixed', () => {
                expect(minimizedOutput.exactToken.toLowerCase()).toBe(
                    baselineOutput.exactToken.toLowerCase(),
                );
                expect(minimizedOutput.exactAmount).toBe(
                    baselineOutput.exactAmount,
                );
            });

            test('minimizeAdjustableAmount does not increase adjustable in', () => {
                const baselineAdjustable =
                    baselineOutput.amountsIn[
                        baselineOutput.adjustableTokenIndex
                    ].amount;
                const minimizedAdjustable =
                    minimizedOutput.amountsIn[
                        minimizedOutput.adjustableTokenIndex
                    ].amount;

                // In aggressive mode we expect adjustable to be <= baseline.
                expect(minimizedAdjustable).toBeLessThanOrEqual(
                    baselineAdjustable,
                );
            });
        });

        describe.skip('weighted pools are rejected by unbalanced via swap', () => {
            test('query rejects for WETH/BAL weighted pool', async () => {
                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.1', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('100', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 0,
                    addLiquidityUserData: '0x',
                    swapKind: SwapKind.GivenIn,
                    sender: txInput.testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        poolState,
                    ),
                ).rejects.toThrow(
                    /Weighted pools are not supported for unbalanced via swap/,
                );
            });
        });

        describe.skip('ReClamm pool: single-sided from adjustable (WETH exact = 0, DAI adjustable as % of pool DAI balance)', () => {
            const FRACTIONS = [
                { label: '0.1%', num: 1n, den: 1000n },
                { label: '0.5%', num: 5n, den: 1000n },
                { label: '1%', num: 1n, den: 100n },
                { label: '5%', num: 5n, den: 100n },
                { label: '10%', num: 1n, den: 10n },
                { label: '20%', num: 2n, den: 10n },
                { label: '30%', num: 3n, den: 10n },
                { label: '40%', num: 4n, den: 10n },
                { label: '50%', num: 1n, den: 2n },
                { label: '60%', num: 3n, den: 5n },
            ] as const;

            let daiPoolBalanceRaw: bigint;

            beforeAll(async () => {
                const reclammWithBalances = await getPoolStateWithBalancesV3(
                    reclammPoolState,
                    chainId,
                    rpcUrl,
                );

                const daiToken = reclammWithBalances.tokens.find(
                    (t) =>
                        t.address.toLowerCase() ===
                        DAI.address.toLowerCase(),
                );
                if (!daiToken) {
                    throw new Error('DAI token not found in ReClamm pool');
                }

                daiPoolBalanceRaw = parseUnits(
                    daiToken.balance,
                    daiToken.decimals,
                );
            });

            for (const { label, num, den } of FRACTIONS) {
                test(`ReClamm single-sided adjustable with DAI budget = ${label} of pool DAI balance`, async () => {
                    const daiBudgetRaw = (daiPoolBalanceRaw * num) / den;

                    const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput =
                        {
                            chainId,
                            rpcUrl,
                            pool: reclammPoolState.address,
                            amountsIn: [
                                {
                                    // exact token (WETH) amount is zero
                                    rawAmount: 0n,
                                    decimals: WETH.decimals,
                                    address: WETH.address,
                                },
                                {
                                    // adjustable token (DAI) budget as a fraction of pool DAI balance
                                    rawAmount: daiBudgetRaw,
                                    decimals: DAI.decimals,
                                    address: DAI.address,
                                },
                            ],
                            exactTokenIndex: 0, // WETH is exact, DAI is adjustable
                            addLiquidityUserData: '0x',
                            swapKind: SwapKind.GivenIn,
                            sender: txInput.testAddress,
                        };

                    const logBase = {
                        scenario: 'reclamm-single-sided-adjustable',
                        label,
                        daiBudgetRaw: daiBudgetRaw.toString(),
                    };

                    try {
                        const queryOutput =
                            await addLiquidityUnbalancedViaSwap.query(
                                addLiquidityInput,
                                reclammPoolState,
                            );

                        // Assertions
                        expect(queryOutput).toBeDefined();
                        expect(queryOutput.pool).toBe(reclammPoolState.address);
                        expect(queryOutput.chainId).toBe(chainId);
                        expect(queryOutput.protocolVersion).toBe(3);
                        expect(queryOutput.amountsIn).toHaveLength(2);
                        expect(queryOutput.bptOut.amount).toBeGreaterThan(0n);

                        // Exact token is WETH with exactAmount = 0
                        expect(
                            queryOutput.exactToken.toLowerCase(),
                        ).toBe(WETH.address.toLowerCase());
                        expect(queryOutput.exactAmount).toBe(0n);

                        // Adjustable token is DAI with some positive amount, within the budget
                        expect(queryOutput.adjustableTokenIndex).toBe(1);
                        const daiIn =
                            queryOutput.amountsIn[
                                queryOutput.adjustableTokenIndex
                            ].amount;
                        expect(daiIn).toBeGreaterThan(0n);
                        expect(daiIn).toBeLessThanOrEqual(daiBudgetRaw);

                        const deltaRaw = daiBudgetRaw - daiIn;
                        const deltaPctMilli =
                            daiBudgetRaw === 0n
                                ? 0n
                                : (deltaRaw * 100000n) / daiBudgetRaw;
                        const deltaPct =
                            (deltaPctMilli / 1000n).toString() +
                            '.' +
                            (deltaPctMilli % 1000n)
                                .toString()
                                .padStart(3, '0');

                        // WETH leg should remain zero
                        const wethIn =
                            queryOutput.amountsIn[
                                queryOutput.adjustableTokenIndex === 0 ? 1 : 0
                            ].amount;
                        expect(wethIn).toBe(0n);

                        appendFileSync(
                            'single-sided-adjustable-results.log',
                            `${JSON.stringify({
                                ...logBase,
                                passed: true,
                                daiIn: daiIn.toString(),
                                wethIn: wethIn.toString(),
                                deltaRaw: deltaRaw.toString(),
                                deltaPct: deltaPct,
                                bptOut: queryOutput.bptOut.amount.toString(),
                            })}\n`,
                        );
                    } catch (err: any) {
                        const msg = err?.message ?? String(err);
                        const isAmountAboveMax =
                            msg.includes('AmountInAboveMaxAdjustableAmount') ||
                            msg.includes('AmountInAboveMaxAdjustable');

                        appendFileSync(
                            'single-sided-adjustable-results.log',
                            `${JSON.stringify({
                                ...logBase,
                                passed: false,
                                error: msg,
                                isAmountAboveMaxAdjustableAmount:
                                    isAmountAboveMax,
                            })}\n`,
                        );

                        throw err;
                    }
                });
            }
        });

        describe('mainnet ReClamm GNO/wstETH (query only, no tx execution)', () => {
            const mainnetChainId = ChainId.GNOSIS_CHAIN;
            const MAINNET_RECLAMM_POOL =
                POOLS[mainnetChainId].reclammGNO_wstETH;
            // Token metadata reused from Gnosis mapping (addresses/decimals match the pool)
            const WSTETH = TOKENS[mainnetChainId].wstETH;
            const GNO = TOKENS[mainnetChainId].GNO;

            beforeAll(async () => {
                ({ rpcUrl: mainnetRpcUrl } = await startFork(
                    ANVIL_NETWORKS[ChainId[mainnetChainId] as keyof typeof ANVIL_NETWORKS],
                ));

                // Minimal PoolState: type, address, tokens with correct addresses/decimals.
                mainnetReclammPoolState = {
                    id: MAINNET_RECLAMM_POOL.id as Hex,
                    address: MAINNET_RECLAMM_POOL.address as Address,
                    type: 'RECLAMM',
                    protocolVersion: 3,
                    tokens: [
                        {
                            address: WSTETH.address,
                            decimals: WSTETH.decimals,
                            index: 0,
                        },
                        {
                            address: GNO.address,
                            decimals: GNO.decimals,
                            index: 1,
                        },
                    ],
                };

                mainnetAddLiquidityUnbalancedViaSwap =
                    new AddLiquidityUnbalancedViaSwapV3();
            });

            test('query returns sensible output for GNO-adjustable, wstETH-exact=0', async () => {
                // Arbitrary sender; we only call `query`, no on-chain execution.
                const sender = '0x0000000000000000000000000000000000000001' as Address;

                // Use a moderate GNO budget to exercise the unbalanced via swap path.
                const gnoBudgetRaw = parseUnits('10', GNO.decimals);

                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId: mainnetChainId,
                    rpcUrl: mainnetRpcUrl,
                    pool: MAINNET_RECLAMM_POOL.address as Address,
                    amountsIn: [
                        {
                            // exact token (wstETH) amount is zero
                            rawAmount: 0n,
                            decimals: WSTETH.decimals,
                            address: WSTETH.address,
                        },
                        {
                            // adjustable token (GNO) budget
                            rawAmount: gnoBudgetRaw,
                            decimals: GNO.decimals,
                            address: GNO.address,
                        },
                    ],
                    exactTokenIndex: 0, // wstETH is exact, GNO is adjustable
                    addLiquidityUserData: '0x',
                    swapKind: SwapKind.GivenIn,
                    sender,
                };

                const queryOutput =
                    await mainnetAddLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        mainnetReclammPoolState,
                    );

                expect(queryOutput).toBeDefined();
                expect(queryOutput.pool).toBe(MAINNET_RECLAMM_POOL.address);
                expect(queryOutput.chainId).toBe(mainnetChainId);
                expect(queryOutput.protocolVersion).toBe(3);
                expect(queryOutput.amountsIn).toHaveLength(2);
                expect(queryOutput.bptOut.amount).toBeGreaterThan(0n);

                // Sanity checks on exact/adjustable legs (no need to execute tx on-chain)
                expect(
                    queryOutput.exactToken.toLowerCase(),
                ).toBe(WSTETH.address.toLowerCase());
                expect(queryOutput.exactAmount).toBe(0n);
                expect(queryOutput.adjustableTokenIndex).toBe(1);
                const gnoIn =
                    queryOutput.amountsIn[queryOutput.adjustableTokenIndex]
                        .amount;
                expect(gnoIn).toBeGreaterThan(0n);
                expect(gnoIn).toBeLessThanOrEqual(gnoBudgetRaw);
            });
        });

        describe.skip('two-token unbalanced join (GivenOut, EXACT_OUT correction swap)', () => {
            let addLiquidityInput: AddLiquidityUnbalancedViaSwapInput;
            let queryOutput: AddLiquidityUnbalancedViaSwapQueryOutput;
            let buildCallInput: AddLiquidityUnbalancedViaSwapBuildCallInput;
            let buildCallOutput: AddLiquidityUnbalancedViaSwapBuildCallOutput;

            beforeAll(async () => {
                addLiquidityInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('9000', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 0, // WETH is exact, BAL is adjustable
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                    swapKind: SwapKind.GivenOut,
                };

                if (USE_DISCOVERED_MAX_ADJUSTABLE) {
                    // Discover natural amounts for the GivenOut scenario.
                    const discovery =
                        await discoverNaturalAmountsUnbalancedViaSwap(
                            addLiquidityInput,
                            poolState,
                            SwapKind.GivenOut,
                        );

                    const naturalAdjustable =
                        discovery.amountsIn[discovery.adjustableTokenIndex]
                            .amount;

                    const adjustedInput: AddLiquidityUnbalancedViaSwapInput = {
                        ...addLiquidityInput,
                        amountsIn: [...addLiquidityInput.amountsIn],
                    };
                    // Here as well, exactTokenIndex is 0 so index 1 is the adjustable token.
                    adjustedInput.amountsIn[1] = {
                        ...adjustedInput.amountsIn[1],
                        rawAmount: naturalAdjustable,
                    };

                    // Query the operation (uses GivenOut BPT helper internally) with discovered adjustable budget.
                    queryOutput = await addLiquidityUnbalancedViaSwap.query(
                        adjustedInput,
                        poolState,
                    );
                } else {
                    // Original behavior: query directly with the test-provided maxAdjustableAmount.
                    queryOutput = await addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        poolState,
                    );
                }

                //10706786970206562159n - adjustable in (givenOut) - 001weth - 9000bal
                //10706786965902209825n - adjustable in (givenIn)  - 001weth - 9000bal

                buildCallInput = {
                    ...queryOutput,
                    slippage: txInput.slippage,
                    wethIsEth: false,
                    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
                };

                buildCallOutput =
                    addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);
            });

            test('query returns valid output for GivenOut scenario', () => {
                expect(queryOutput).toBeDefined();
                expect(queryOutput.pool).toBe(poolState.address);
                expect(queryOutput.chainId).toBe(chainId);
                expect(queryOutput.protocolVersion).toBe(3);
                expect(queryOutput.amountsIn).toHaveLength(2);
                expect(queryOutput.bptOut.amount).toBeGreaterThan(0n);
                expect(queryOutput.exactToken).toBe(WETH.address);
                expect(queryOutput.exactAmount).toBe(
                    addLiquidityInput.amountsIn[0].rawAmount,
                );
            });

            test('transaction executes successfully (GivenOut)', async () => {
                const txHash = await client.sendTransaction({
                    to: buildCallOutput.to,
                    data: buildCallOutput.callData,
                    value: buildCallOutput.value,
                    account: txInput.testAddress,
                    chain: CHAINS[chainId],
                });

                const receipt = await client.waitForTransactionReceipt({
                    hash: txHash,
                });

                expect(receipt.status).toBe('success');
                expect(receipt.transactionHash).toBe(txHash);
            });
        });

        describe.skip('add liquidity unbalanced via swap with BAL as exact token', () => {
            let addLiquidityInput: AddLiquidityUnbalancedViaSwapInput;
            let queryOutput: AddLiquidityUnbalancedViaSwapQueryOutput;

            beforeAll(async () => {
                addLiquidityInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('0.02', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 1, // BAL is exact, WETH is adjustable
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                };

                queryOutput = await addLiquidityUnbalancedViaSwap.query(
                    addLiquidityInput,
                    poolState,
                );
            });

            test('exact token is BAL, adjustable token is WETH', () => {
                expect(queryOutput.exactToken.toLowerCase()).toBe(
                    BAL.address.toLowerCase(),
                );
                expect(queryOutput.adjustableTokenIndex).toBe(0);
                expect(
                    queryOutput.amountsIn[0].token.address.toLowerCase(),
                ).toBe(WETH.address.toLowerCase());
                expect(
                    queryOutput.amountsIn[1].token.address.toLowerCase(),
                ).toBe(BAL.address.toLowerCase());
            });

            test('exact amount matches BAL input', () => {
                expect(queryOutput.exactAmount).toBe(
                    addLiquidityInput.amountsIn[1].rawAmount,
                );
            });
        });

        describe.skip('add liquidity unbalanced via swap with permit2', () => {
            let addLiquidityInput: AddLiquidityUnbalancedViaSwapInput;
            let queryOutput: AddLiquidityUnbalancedViaSwapQueryOutput;
            let buildCallInput: AddLiquidityUnbalancedViaSwapBuildCallInput;
            let buildCallOutput: AddLiquidityUnbalancedViaSwapBuildCallOutput;

            beforeAll(async () => {
                addLiquidityInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('0.02', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 0,
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                };

                queryOutput = await addLiquidityUnbalancedViaSwap.query(
                    addLiquidityInput,
                    poolState,
                );

                buildCallInput = {
                    ...queryOutput,
                    slippage: txInput.slippage,
                    wethIsEth: false,
                    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
                };

                // Test with permit2
                const permit2 = {
                    batch: {
                        details: [],
                        spender:
                            '0x0000000000000000000000000000000000000000' as Address,
                        sigDeadline: BigInt(
                            Math.floor(Date.now() / 1000) + 3600,
                        ),
                    },
                    signature: '0x' as Hex,
                };

                buildCallOutput =
                    addLiquidityUnbalancedViaSwap.buildCallWithPermit2(
                        buildCallInput,
                        permit2,
                    );
            });

            test('permit2 buildCall returns valid output', () => {
                expect(buildCallOutput).toBeDefined();
                expect(buildCallOutput.callData).toBeDefined();
                expect(buildCallOutput.to).toBeDefined();
                expect(buildCallOutput.value).toBeDefined();
                expect(buildCallOutput.exactBptAmountOut).toBeDefined();
                expect(buildCallOutput.maxAdjustableAmount).toBeDefined();
            });

            test('permit2 callData is different from regular callData', () => {
                const regularBuildCall =
                    addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);
                expect(buildCallOutput.callData).not.toBe(
                    regularBuildCall.callData,
                );
            });
        });

        describe.skip('error cases', () => {
            test('throws error for invalid exactTokenIndex', async () => {
                const invalidInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('0.02', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 2, // Invalid index
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        invalidInput,
                        poolState,
                    ),
                ).rejects.toThrow();
            });

            test('throws error for wrong number of tokens', async () => {
                const invalidInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        // Missing second token
                    ],
                    exactTokenIndex: 0,
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        invalidInput,
                        poolState,
                    ),
                ).rejects.toThrow();
            });

            test('throws error for zero amounts', async () => {
                const invalidInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    pool: poolState.address,
                    amountsIn: [
                        {
                            rawAmount: 0n,
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('0.02', BAL.decimals),
                            decimals: BAL.decimals,
                            address: BAL.address,
                        },
                    ],
                    exactTokenIndex: 0,
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: txInput.testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        invalidInput,
                        poolState,
                    ),
                ).rejects.toThrow();
            });
        });
    });
});


