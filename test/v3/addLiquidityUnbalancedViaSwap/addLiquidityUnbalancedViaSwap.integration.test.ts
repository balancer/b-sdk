// pnpm test v3/addLiquidityUnbalancedViaSwap/addLiquidityUnbalancedViaSwap.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    createTestClient,
    http,
    maxUint256,
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
    isSameAddress,
    getPoolStateWithBalancesV3,
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
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { appendFileSync } from 'node:fs';
import {
    POOLS,
    TOKENS,
    sendTransactionGetBalances,
    areBigIntsWithinPercent,
    SimulateParams,
    forkSetup,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.MAINNET;
const poolId: Address = POOLS[chainId].AAVE_WETH.id;

const AAVE = TOKENS[chainId].AAVE;
const WETH = TOKENS[chainId].WETH;

// Toggle to control whether test results should be logged to files
const ENABLE_LOGGING = false;

class MockApi {
    async getPool(poolId: Address): Promise<PoolState> {
        if (isSameAddress(poolId, POOLS[chainId].AAVE_WETH.id)) {
            // ReClamm pool with AAVE / WETH
            return {
                id: poolId,
                address: poolId,
                type: 'RECLAMM',
                protocolVersion: 3,
                tokens: [
                    {
                        address: AAVE.address,
                        decimals: AAVE.decimals,
                        index: 0,
                    },
                    {
                        address: WETH.address,
                        decimals: WETH.decimals,
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
    let tokens: Address[];
    let rpcUrl: string;
    let snapshot: Hex;
    let addLiquidityUnbalancedViaSwap: AddLiquidityUnbalancedViaSwapV3;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS[ChainId[chainId]],
            undefined,
            24326402n,
        ));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[1];

        addLiquidityUnbalancedViaSwap = new AddLiquidityUnbalancedViaSwapV3();

        tokens = [...poolState.tokens.map((t) => t.address)];

        await forkSetup(
            client,
            testAddress,
            tokens,
            [AAVE.slot, WETH.slot] as number[],
            [...poolState.tokens.map((t) => parseUnits('1000000', t.decimals))],
            undefined,
            protocolVersion,
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
                        decimals: AAVE.decimals,
                        address: AAVE.address,
                    },
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        poolState,
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
                        rawAmount: parseUnits('100', AAVE.decimals),
                        decimals: AAVE.decimals,
                        address: AAVE.address,
                    },
                    addLiquidityUserData: '0x',
                    swapUserData: '0x',
                    sender: testAddress,
                };

                await expect(
                    addLiquidityUnbalancedViaSwap.query(
                        addLiquidityInput,
                        poolState,
                    ),
                ).rejects.toThrow();
            });
        });

        describe('ReClamm pool: single-sided from adjustable (WETH exact = 0, AAVE adjustable as % of pool AAVE balance)', () => {
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

            let aavePoolBalanceRaw: bigint;

            beforeAll(async () => {
                const poolStateWithBalances = await getPoolStateWithBalancesV3(
                    poolState,
                    chainId,
                    rpcUrl,
                );

                const aaveToken = poolStateWithBalances.tokens.find((t) =>
                    isSameAddress(t.address, AAVE.address),
                );
                if (!aaveToken) {
                    throw new Error('AAVE token not found in ReClamm pool');
                }

                aavePoolBalanceRaw = parseUnits(
                    aaveToken.balance,
                    aaveToken.decimals,
                );
            });

            for (const { label, num, den } of FRACTIONS) {
                test(`ReClamm single-sided adjustable with AAVE budget = ${label} of pool AAVE balance`, async () => {
                    const aaveBudgetRaw = (aavePoolBalanceRaw * num) / den;

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
                                // adjustable token (AAVE) budget as a fraction of pool AAVE balance
                                rawAmount: aaveBudgetRaw,
                                decimals: AAVE.decimals,
                                address: AAVE.address,
                            },
                            addLiquidityUserData: '0x',
                            sender: testAddress,
                        };

                    const logBase = {
                        scenario: 'reclamm-single-sided-adjustable',
                        label,
                        aaveBudgetRaw: aaveBudgetRaw.toString(),
                    };

                    try {
                        const queryOutput =
                            await addLiquidityUnbalancedViaSwap.query(
                                addLiquidityInput,
                                poolState,
                            );

                        // Assertions
                        expect(queryOutput).toBeDefined();
                        expect(queryOutput.pool).toBe(poolState.address);
                        expect(queryOutput.chainId).toBe(chainId);
                        expect(queryOutput.protocolVersion).toBe(3);
                        expect(queryOutput.bptOut.amount).toBeGreaterThan(0n);

                        // Exact token is WETH with exactAmount = 0
                        expect(
                            queryOutput.exactAmountIn.token.address.toLowerCase(),
                        ).toBe(WETH.address.toLowerCase());
                        expect(queryOutput.exactAmountIn.amount).toBe(0n);

                        // Adjustable token is AAVE with some positive amount, within the budget
                        const aaveIn = queryOutput.maxAdjustableAmountIn.amount;
                        expect(aaveIn).toBeGreaterThan(0n);
                        expect(aaveIn).toBeLessThanOrEqual(aaveBudgetRaw);

                        // Calculate percentage diff between given and calculated amounts in
                        const deltaRaw = aaveBudgetRaw - aaveIn;
                        const deltaPctMilli =
                            aaveBudgetRaw === 0n
                                ? 0n
                                : (deltaRaw * 100000n) / aaveBudgetRaw;
                        const deltaPct = `${(deltaPctMilli / 1000n).toString()}.${(deltaPctMilli % 1000n).toString().padStart(3, '0')}`;

                        const wethIn = queryOutput.exactAmountIn.amount;

                        // Execute the transaction
                        const buildCallInput = {
                            ...queryOutput,
                            slippage: Slippage.fromPercentage('1'), // 1% slippage
                            deadline: maxUint256,
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
                                    ...poolState.tokens.map((t) => t.address),
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

                        // Verify input token amounts (WETH should be 0, AAVE should be used)
                        const aaveDelta = balanceDeltas[0];
                        const wethDelta = balanceDeltas[1];
                        const bptDelta = balanceDeltas[2];

                        expect(wethDelta).toBe(0n);
                        expect(aaveDelta).toBeGreaterThan(0n);
                        expect(aaveDelta).toBeLessThanOrEqual(aaveBudgetRaw);
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
                                    aaveIn: aaveIn.toString(),
                                    wethIn: wethIn.toString(),
                                    deltaRaw: deltaRaw.toString(),
                                    deltaPct: deltaPct,
                                    bptOut: queryOutput.bptOut.amount.toString(),
                                    transactionExecuted: true,
                                    bptDelta: bptDelta.toString(),
                                    aaveDelta: aaveDelta.toString(),
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
