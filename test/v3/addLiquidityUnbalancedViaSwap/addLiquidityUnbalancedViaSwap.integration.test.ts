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
    TokenAmount,
} from '@/index';
import {    
    unbalancedAddViaSwapRouterAbi_V3,
    vaultExtensionAbi_V3,
    vaultAbi_V3,
    permit2Abi,
} from '@/abi';
import {
    AddLiquidityUnbalancedViaSwapV3,
    AddLiquidityUnbalancedViaSwapInput,
} from '@/entities/addLiquidityUnbalancedViaSwap';
import { getPoolStateWithBalancesV3 } from '@/entities/utils/getPoolStateWithBalancesV3';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { appendFileSync } from 'node:fs';
import {
    POOLS,
    TOKENS,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
    sendTransactionGetBalances,
    areBigIntsWithinPercent,
    SimulateParams
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.id;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const DAI = TOKENS[chainId].DAI;
const STATA_USDC = TOKENS[chainId].stataUSDC;
const STATA_USDT = TOKENS[chainId].stataUSDT;

// Toggle to control whether test results should be logged to files
const ENABLE_LOGGING = false;

class MockApi {
    async getPool(poolId: string): Promise<PoolState> {
        const lowerId = poolId.toLowerCase();

        if (lowerId === POOLS[chainId].MOCK_WETH_BAL_POOL.id.toLowerCase()) {
            // WETH/BAL weighted pool
            return {
                id: poolId as `0x${string}`,
                address: POOLS[chainId].MOCK_WETH_BAL_POOL.address as Address,
                type: 'WEIGHTED',
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

        if (lowerId === POOLS[chainId].MOCK_BOOSTED_POOL.id.toLowerCase()) {
            // stataUSDC/stataUSDT stable (boosted) pool at 0x59fa488dda749cdd41772bb068bb23ee955a6d7a
            return {
                id: poolId as `0x${string}`,
                address: POOLS[chainId].MOCK_BOOSTED_POOL.address as Address,
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

        if (lowerId === POOLS[chainId].MOCK_RECLAMM_POOL.id.toLowerCase()) {
            // ReClamm pool with WETH / DAI
            return {
                id: poolId as `0x${string}`,
                address: POOLS[chainId].MOCK_RECLAMM_POOL.address as Address,
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
    let testAddress: Address;
    let poolState: PoolState;
    let reclammPoolState: PoolState;
    let tokens: Address[];
    let rpcUrl: string;
    let snapshot: Hex;
    let addLiquidityUnbalancedViaSwap: AddLiquidityUnbalancedViaSwapV3;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);
        reclammPoolState = await api.getPool(
            POOLS[chainId].MOCK_RECLAMM_POOL.id,
        );

        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS[ChainId[chainId]],
            undefined,
            9718873n,
        ));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        addLiquidityUnbalancedViaSwap = new AddLiquidityUnbalancedViaSwapV3();

        tokens = [...poolState.tokens.map((t) => t.address)];

        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [WETH.slot, DAI.slot] as number[],
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
            await approveTokens(client, testAddress, tokens, protocolVersion);
        });

        describe('ReClamm pool: error cases for unsupported scenarios', () => {
            test('throws error when adjustableAmount is 0 and exactAmount > 0', async () => {
                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    pool: reclammPoolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals),
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: 0n, // adjustableAmount = 0 (unsupported)
                            decimals: DAI.decimals,
                            address: DAI.address,
                        },
                    ],
                    exactTokenIndex: 0, // WETH is exact, DAI is adjustable
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: testAddress,
                    swapKind: SwapKind.GivenIn,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        reclammPoolState,
                    ),
                ).rejects.toThrow();
            });

            test('throws error when both amounts are > 0', async () => {
                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    pool: reclammPoolState.address,
                    amountsIn: [
                        {
                            rawAmount: parseUnits('0.01', WETH.decimals), // exactAmount > 0 (unsupported)
                            decimals: WETH.decimals,
                            address: WETH.address,
                        },
                        {
                            rawAmount: parseUnits('100', DAI.decimals), // adjustableAmount > 0
                            decimals: DAI.decimals,
                            address: DAI.address,
                        },
                    ],
                    exactTokenIndex: 0, // WETH is exact, DAI is adjustable
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: testAddress,
                    swapKind: SwapKind.GivenIn,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        reclammPoolState,
                    ),
                ).rejects.toThrow();
            });
        });

        describe('ReClamm pool: single-sided from adjustable (WETH exact = 0, DAI adjustable as % of pool DAI balance)', () => {
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
                        t.address.toLowerCase() === DAI.address.toLowerCase(),
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
                            sender: testAddress,
                        };

                    const logBase = {
                        scenario: 'reclamm-single-sided-adjustable',
                        label,
                        daiBudgetRaw: daiBudgetRaw.toString(),
                    };

                    // the pool has these tokens
                    

                    // the add liquidity input is
                    // weth 0x7b79995e5f793a07bc00c21412e50ecae098e7f9
                    // dai 0xb77eb1a70a96fdaaeb31db1b42f2b8b5846b2613

                    // the dai is not the same? 



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
                        expect(queryOutput.exactToken.toLowerCase()).toBe(
                            WETH.address.toLowerCase(),
                        );
                        expect(queryOutput.exactAmount).toBe(0n);

                        // Adjustable token is DAI with some positive amount, within the budget
                        expect(queryOutput.adjustableTokenIndex).toBe(1);
                        const daiIn =
                            queryOutput.amountsIn[
                                queryOutput.adjustableTokenIndex
                            ].amount;
                        expect(daiIn).toBeGreaterThan(0n);
                        expect(daiIn).toBeLessThanOrEqual(daiBudgetRaw);

                        // 
                        const deltaRaw = daiBudgetRaw - daiIn;
                        const deltaPctMilli =
                            daiBudgetRaw === 0n
                                ? 0n
                                : (deltaRaw * 100000n) / daiBudgetRaw;
                        const deltaPct = `${(deltaPctMilli / 1000n).toString()}.${(deltaPctMilli % 1000n).toString().padStart(3, '0')}`;

                        // WETH leg should remain zero
                        const wethIn =
                            queryOutput.amountsIn[
                                queryOutput.adjustableTokenIndex === 0 ? 1 : 0
                            ].amount;
                        expect(wethIn).toBe(0n);

                        // Execute the transaction
                        const deadline = 281474976710654n; // Large deadline for testing
                        // the queryoutput returns the actual amountsIn, not the
                        // daiBudgetRaw. 
                        const buildCallInput = {
                            ...queryOutput,
                            slippage: Slippage.fromPercentage('1'), // 1% slippage
                            deadline,
                        };

                        const buildCallOutput =
                            addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);

                        expect(buildCallOutput.to).toBe(
                            AddressProvider.UnbalancedAddViaSwapRouter(chainId),
                        );
                        expect(buildCallOutput.value).toBe(0n);

                        // Send transaction and check balance changes

                        // attach optional simulate params to the transaction
                        const simulateParams: SimulateParams = {
                            abi: [...unbalancedAddViaSwapRouterAbi_V3, ...vaultExtensionAbi_V3, ...vaultAbi_V3, ...permit2Abi] as Abi,
                            functionName: 'addLiquidityUnbalanced',
                            args: [
                                buildCallInput.pool,
                                buildCallInput.deadline,
                                false,
                                {
                                    exactBptAmountOut: buildCallInput.bptOut.amount,
                                    exactToken: buildCallInput.exactToken,
                                    exactAmount: buildCallInput.exactAmount,
                                    maxAdjustableAmount: buildCallInput.amountsIn[buildCallInput.adjustableTokenIndex].amount,
                                    addLiquidityUserData: '0x',
                                    swapUserData: '0x',
                                },
                            ] as const,
                            address: buildCallOutput.to,
                            account: testAddress,
                        };
                        const { transactionReceipt, balanceDeltas } =
                            await sendTransactionGetBalances(
                                [
                                    ...reclammPoolState.tokens.map((t) => t.address),
                                    queryOutput.bptOut.token.address, // BPT token
                                ],
                                client,
                                testAddress,
                                buildCallOutput.to,
                                buildCallOutput.callData,
                                buildCallOutput.value,
                                simulateParams,
                            );

                        expect(transactionReceipt.status).toBe('success');

                        // Verify input token amounts (WETH should be 0, DAI should be used)
                        const wethDelta = balanceDeltas[0];
                        const daiDelta = balanceDeltas[1];
                        const bptDelta = balanceDeltas[2];

                        expect(wethDelta).toBe(0n);
                        expect(daiDelta).toBeGreaterThan(0n);
                        expect(daiDelta).toBeLessThanOrEqual(daiBudgetRaw);
                        expect(bptDelta).toBeGreaterThan(0n);

                        // Verify BPT output is within acceptable tolerance
                        areBigIntsWithinPercent(
                            bptDelta,
                            queryOutput.bptOut.amount,
                            0.01, // 1% tolerance
                        );

                        if (ENABLE_LOGGING) {
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
                                    transactionExecuted: true,
                                    bptDelta: bptDelta.toString(),
                                    daiDelta: daiDelta.toString(),
                                })}\n`,
                            );
                        }
                    } catch (err: unknown) {
                        const msg =
                            err instanceof Error ? err.message : String(err);
                        const isAmountAboveMax =
                            msg.includes('AmountInAboveMaxAdjustableAmount') ||
                            msg.includes('AmountInAboveMaxAdjustable');

                        if (ENABLE_LOGGING) {
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
                        }

                        throw err;
                    }
                });
            }
        });

        // SKIP as The router is not deployed on Gnosis yet
        describe.skip('Gnosis ReClamm GNO/wstETH: single-sided from adjustable (wstETH exact = 0, GNO adjustable as % of pool GNO balance)', () => {
            const gnosisChainId = ChainId.GNOSIS_CHAIN;
            const RECLAMM_POOL = POOLS[gnosisChainId].reclammGNO_wstETH;
            // Token metadata reused from Gnosis mapping (addresses/decimals match the pool)
            const WSTETH = TOKENS[gnosisChainId].wstETH;
            const GNO = TOKENS[gnosisChainId].GNO;

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

            let gnosisReclammPoolState: PoolState;
            let gnosisRpcUrl: string;
            let gnosisAddLiquidityUnbalancedViaSwap: AddLiquidityUnbalancedViaSwapV3;
            let gnoPoolBalanceRaw: bigint;

            beforeAll(async () => {
                ({ rpcUrl: gnosisRpcUrl } = await startFork(
                    ANVIL_NETWORKS[
                        ChainId[gnosisChainId] as keyof typeof ANVIL_NETWORKS
                    ],
                ));

                // Minimal PoolState: type, address, tokens with correct addresses/decimals.
                gnosisReclammPoolState = {
                    id: RECLAMM_POOL.id as Hex,
                    address: RECLAMM_POOL.address as Address,
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

                gnosisAddLiquidityUnbalancedViaSwap =
                    new AddLiquidityUnbalancedViaSwapV3();

                // Get pool balance for GNO (adjustable token)
                const reclammWithBalances = await getPoolStateWithBalancesV3(
                    gnosisReclammPoolState,
                    gnosisChainId,
                    gnosisRpcUrl,
                );

                const gnoToken = reclammWithBalances.tokens.find(
                    (t) =>
                        t.address.toLowerCase() === GNO.address.toLowerCase(),
                );
                if (!gnoToken) {
                    throw new Error('GNO token not found in ReClamm pool');
                }

                gnoPoolBalanceRaw = parseUnits(
                    gnoToken.balance,
                    gnoToken.decimals,
                );
            });

            for (const { label, num, den } of FRACTIONS) {
                test(`Gnosis ReClamm single-sided adjustable with GNO budget = ${label} of pool GNO balance`, async () => {
                    // Arbitrary sender; we only call `query`, no on-chain execution.
                    const sender =
                        '0x0000000000000000000000000000000000000001' as Address;

                    const gnoBudgetRaw = (gnoPoolBalanceRaw * num) / den;

                    const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput =
                        {
                            chainId: gnosisChainId,
                            rpcUrl: gnosisRpcUrl,
                            pool: RECLAMM_POOL.address as Address,
                            amountsIn: [
                                {
                                    // exact token (wstETH) amount is zero
                                    rawAmount: 0n,
                                    decimals: WSTETH.decimals,
                                    address: WSTETH.address,
                                },
                                {
                                    // adjustable token (GNO) budget as a fraction of pool GNO balance
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

                    const logBase = {
                        scenario: 'gnosis-reclamm-single-sided-adjustable',
                        label,
                        gnoBudgetRaw: gnoBudgetRaw.toString(),
                    };

                    try {
                        const queryOutput =
                            await gnosisAddLiquidityUnbalancedViaSwap.query(
                                addLiquidityInput,
                                gnosisReclammPoolState,
                            );

                        // Assertions
                        expect(queryOutput).toBeDefined();
                        expect(queryOutput.pool).toBe(RECLAMM_POOL.address);
                        expect(queryOutput.chainId).toBe(gnosisChainId);
                        expect(queryOutput.protocolVersion).toBe(3);
                        expect(queryOutput.amountsIn).toHaveLength(2);
                        expect(queryOutput.bptOut.amount).toBeGreaterThan(0n);

                        // Exact token is wstETH with exactAmount = 0
                        expect(queryOutput.exactToken.toLowerCase()).toBe(
                            WSTETH.address.toLowerCase(),
                        );
                        expect(queryOutput.exactAmount).toBe(0n);

                        // Adjustable token is GNO with some positive amount, within the budget
                        expect(queryOutput.adjustableTokenIndex).toBe(1);
                        const gnoIn =
                            queryOutput.amountsIn[
                                queryOutput.adjustableTokenIndex
                            ].amount;
                        expect(gnoIn).toBeGreaterThan(0n);
                        expect(gnoIn).toBeLessThanOrEqual(gnoBudgetRaw);

                        const deltaRaw = gnoBudgetRaw - gnoIn;
                        const deltaPctMilli =
                            gnoBudgetRaw === 0n
                                ? 0n
                                : (deltaRaw * 100000n) / gnoBudgetRaw;
                        const deltaPct = `${(deltaPctMilli / 1000n).toString()}.${(deltaPctMilli % 1000n).toString().padStart(3, '0')}`;

                        // wstETH leg should remain zero
                        const wstEthIn =
                            queryOutput.amountsIn[
                                queryOutput.adjustableTokenIndex === 0 ? 1 : 0
                            ].amount;
                        expect(wstEthIn).toBe(0n);

                        if (ENABLE_LOGGING) {
                            appendFileSync(
                                'gnosis-single-sided-adjustable-results.log',
                                `${JSON.stringify({
                                    ...logBase,
                                    passed: true,
                                    gnoIn: gnoIn.toString(),
                                    wstEthIn: wstEthIn.toString(),
                                    deltaRaw: deltaRaw.toString(),
                                    deltaPct: deltaPct,
                                    bptOut: queryOutput.bptOut.amount.toString(),
                                })}\n`,
                            );
                        }
                    } catch (err: unknown) {
                        const msg =
                            err instanceof Error ? err.message : String(err);
                        const isAmountAboveMax =
                            msg.includes('AmountInAboveMaxAdjustableAmount') ||
                            msg.includes('AmountInAboveMaxAdjustable');

                        if (ENABLE_LOGGING) {
                            appendFileSync(
                                'gnosis-single-sided-adjustable-results.log',
                                `${JSON.stringify({
                                    ...logBase,
                                    passed: false,
                                    error: msg,
                                    isAmountAboveMaxAdjustableAmount:
                                        isAmountAboveMax,
                                })}\n`,
                            );
                        }

                        throw err;
                    }
                });
            }
        });
    });
});
