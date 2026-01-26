// pnpm test v3/addLiquidityUnbalancedViaSwap/addLiquidityUnbalancedViaSwap.integration.test.ts

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
    PERMIT2,
    PublicWalletClient,
    ReClammPoolStateWithBalances,
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
import { getReClammPoolStateWithBalances } from '@/entities/utils/getPoolStateWithBalancesV3';
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
    SimulateParams,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.id;

const WETH = TOKENS[chainId].WETH;
const DAI = TOKENS[chainId].DAI;
const STATA_USDC = TOKENS[chainId].stataUSDC;
const STATA_USDT = TOKENS[chainId].stataUSDT;

// Toggle to control whether test results should be logged to files
const ENABLE_LOGGING = true;

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
    let reclammWithBalances: ReClammPoolStateWithBalances;
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
            10003483n,
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

        // but are these actually the tokens of the pool?
        beforeEach(async () => {
            await approveTokens(client, testAddress, tokens, protocolVersion);
        });

        describe('ReClamm pool: error cases for unsupported scenarios', () => {
            test('throws error when adjustableAmount is 0 and exactAmount > 0', async () => {
                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    exactAmountIn: {
                        rawAmount: parseUnits('0.01', WETH.decimals),
                        decimals: WETH.decimals,
                        address: WETH.address,
                    },
                    maxAdjustableAmountIn: {
                        rawAmount: 0n, // maxAdjustbaleAmountIn = 0 -> not supported
                        decimals: DAI.decimals,
                        address: DAI.address,
                    },
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        reclammPoolState as ReClammPoolStateWithBalances,
                    ),
                ).rejects.toThrow();
            });

            test('throws error when both amounts are > 0', async () => {
                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    exactAmountIn: {
                        rawAmount: parseUnits('0.01', WETH.decimals), // exactAmount > 0 -> not supported
                        decimals: WETH.decimals,
                        address: WETH.address,
                    },
                    maxAdjustableAmountIn: {
                        rawAmount: parseUnits('100', DAI.decimals),
                        decimals: DAI.decimals,
                        address: DAI.address,
                    },
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        reclammPoolState as ReClammPoolStateWithBalances,
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
                reclammWithBalances = await getReClammPoolStateWithBalances(
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
                            exactAmountIn: {
                                // exact token (WETH) amount is zero
                                rawAmount: 0n,
                                decimals: WETH.decimals,
                                address: WETH.address,
                            },
                            maxAdjustableAmountIn: {
                                // adjustable token (DAI) budget as a fraction of pool DAI balance
                                rawAmount: daiBudgetRaw,
                                decimals: DAI.decimals,
                                address: DAI.address,
                            },
                            addLiquidityUserData: '0x',
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
                                reclammWithBalances,
                            );

                        // Assertions
                        expect(queryOutput).toBeDefined();
                        expect(queryOutput.pool).toBe(reclammPoolState.address);
                        expect(queryOutput.chainId).toBe(chainId);
                        expect(queryOutput.protocolVersion).toBe(3);
                        expect(queryOutput.bptOut.amount).toBeGreaterThan(0n);

                        // Exact token is WETH with exactAmount = 0
                        expect(
                            queryOutput.exactAmountIn.token.address.toLowerCase(),
                        ).toBe(WETH.address.toLowerCase());
                        expect(queryOutput.exactAmountIn.amount).toBe(0n);

                        // Adjustable token is DAI with some positive amount, within the budget
                        const daiIn = queryOutput.maxAdjustableAmountIn.amount;
                        expect(daiIn).toBeGreaterThan(0n);
                        expect(daiIn).toBeLessThanOrEqual(daiBudgetRaw);

                        //
                        const deltaRaw = daiBudgetRaw - daiIn;
                        const deltaPctMilli =
                            daiBudgetRaw === 0n
                                ? 0n
                                : (deltaRaw * 100000n) / daiBudgetRaw;
                        const deltaPct = `${(deltaPctMilli / 1000n).toString()}.${(deltaPctMilli % 1000n).toString().padStart(3, '0')}`;

                        const wethIn = queryOutput.exactAmountIn.amount;
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
                            addLiquidityUnbalancedViaSwap.buildCall(
                                buildCallInput,
                            );

                        expect(buildCallOutput.to).toBe(
                            AddressProvider.UnbalancedAddViaSwapRouter(chainId),
                        );
                        expect(buildCallOutput.value).toBe(0n);

                        // Send transaction and check balance changes

                        // attach optional simulate params to the transaction
                        const simulateParams: SimulateParams = {
                            abi: [
                                ...unbalancedAddViaSwapRouterAbi_V3,
                                ...vaultExtensionAbi_V3,
                                ...vaultAbi_V3,
                                ...permit2Abi,
                            ],
                            functionName: 'addLiquidityUnbalanced',
                            args: [
                                buildCallInput.pool,
                                buildCallInput.deadline,
                                false,
                                {
                                    exactBptAmountOut:
                                        buildCallInput.bptOut.amount,
                                    exactToken:
                                        buildCallInput.exactAmountIn.token
                                            .address,
                                    exactAmount:
                                        buildCallInput.exactAmountIn.amount,
                                    maxAdjustableAmount:
                                        buildCallInput.maxAdjustableAmountIn
                                            .amount,
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
                                    ...reclammPoolState.tokens.map(
                                        (t) => t.address,
                                    ),
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
    });
});
