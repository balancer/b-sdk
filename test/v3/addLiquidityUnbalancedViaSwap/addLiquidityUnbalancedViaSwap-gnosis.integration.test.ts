// pnpm test v3/addLiquidityUnbalancedViaSwap/addLiquidityUnbalancedViaSwap-gnosis.integration.test.ts

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
    PublicWalletClient,
    isSameAddress,
    getPoolStateWithBalancesV3,
    PoolTokenWithBalance,
} from '@/index';
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
    forkSetup,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.GNOSIS_CHAIN;
const poolId: Address = POOLS[chainId].USDCe_GNO.id;

const USDCe = TOKENS[chainId].USDCe;
const GNO = TOKENS[chainId].GNO;

// Toggle to control whether test results should be logged to files
const ENABLE_LOGGING = true;
const fileName = 'reclamm-single-sided-adjustable-gnosis';

class MockApi {
    async getPool(id: Address): Promise<PoolState> {
        if (isSameAddress(id, poolId)) {
            // ReClamm pool with AAVE / WETH
            return {
                id,
                address: id,
                type: 'RECLAMM',
                protocolVersion: 3,
                tokens: [
                    {
                        address: USDCe.address,
                        decimals: USDCe.decimals,
                        index: 0,
                    },
                    {
                        address: GNO.address,
                        decimals: GNO.decimals,
                        index: 1,
                    },
                ],
            };
        }

        throw new Error(`Unknown test poolId: ${id}`);
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

        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

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
            [USDCe.slot, GNO.slot] as number[],
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
                        rawAmount: parseUnits('0.01', GNO.decimals),
                        decimals: GNO.decimals,
                        address: GNO.address,
                    },
                    maxAdjustableAmountIn: {
                        rawAmount: 0n, // maxAdjustbaleAmountIn = 0 -> not supported
                        decimals: USDCe.decimals,
                        address: USDCe.address,
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
                        rawAmount: parseUnits('0.01', GNO.decimals), // exactAmount > 0 -> not supported
                        decimals: GNO.decimals,
                        address: GNO.address,
                    },
                    maxAdjustableAmountIn: {
                        rawAmount: parseUnits('100', USDCe.decimals),
                        decimals: USDCe.decimals,
                        address: USDCe.address,
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

            let maxAdjustableTokenBalanceRaw: bigint;
            let maxAdjustableToken: PoolTokenWithBalance;

            beforeAll(async () => {
                const poolStateWithBalances = await getPoolStateWithBalancesV3(
                    poolState,
                    chainId,
                    rpcUrl,
                );

                maxAdjustableToken = poolStateWithBalances.tokens.find((t) =>
                    isSameAddress(t.address, USDCe.address),
                ) as PoolTokenWithBalance;

                maxAdjustableTokenBalanceRaw = parseUnits(
                    maxAdjustableToken.balance,
                    maxAdjustableToken.decimals,
                );
            });

            for (const { label, num, den } of FRACTIONS) {
                test(`ReClamm single-sided adjustable with given amount = ${label} of pool balance`, async () => {
                    const maxAdjustableAmountGiven =
                        (maxAdjustableTokenBalanceRaw * num) / den;

                    const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput =
                        {
                            chainId,
                            rpcUrl,
                            exactAmountIn: {
                                // exact token (WETH) amount is zero
                                rawAmount: 0n,
                                decimals: GNO.decimals,
                                address: GNO.address,
                            },
                            maxAdjustableAmountIn: {
                                // adjustable token (AAVE) budget as a fraction of pool AAVE balance
                                rawAmount: maxAdjustableAmountGiven,
                                decimals: USDCe.decimals,
                                address: USDCe.address,
                            },
                            addLiquidityUserData: '0x',
                            sender: testAddress,
                        };

                    const logBase = {
                        scenario: fileName,
                        label,
                        aaveBudgetRaw: maxAdjustableAmountGiven.toString(),
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
                        ).toBe(GNO.address.toLowerCase());
                        expect(queryOutput.exactAmountIn.amount).toBe(0n);

                        // Adjustable token is AAVE with some positive amount, within the budget
                        const maxAdjustableAmountInCalculated =
                            queryOutput.maxAdjustableAmountIn.amount;
                        expect(maxAdjustableAmountInCalculated).toBeGreaterThan(
                            0n,
                        );
                        expect(
                            maxAdjustableAmountInCalculated,
                        ).toBeLessThanOrEqual(maxAdjustableAmountGiven + 10n); // small tolerance for tokens with less decimals because query rounds up

                        // Calculate percentage diff between given and calculated amounts in
                        const deltaRaw =
                            maxAdjustableAmountGiven -
                            maxAdjustableAmountInCalculated;
                        const deltaPctMilli =
                            maxAdjustableAmountGiven === 0n
                                ? 0n
                                : (deltaRaw * 100000n) /
                                  maxAdjustableAmountGiven;
                        const deltaPct = `${(deltaPctMilli / 1000n).toString()}.${(deltaPctMilli % 1000n).toString().padStart(3, '0')}`;

                        const exactAmountInCalculated =
                            queryOutput.exactAmountIn.amount;

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
                            );

                        expect(transactionReceipt.status).toBe('success');

                        // Verify input token amounts
                        const maxAdjustableTokenDelta =
                            balanceDeltas[maxAdjustableToken.index];
                        const exactTokenDelta =
                            balanceDeltas[
                                maxAdjustableToken.index === 0 ? 1 : 0
                            ];
                        const bptDelta = balanceDeltas[2];

                        expect(exactTokenDelta).toBe(0n);
                        expect(maxAdjustableTokenDelta).toBeGreaterThan(0n);
                        expect(bptDelta).toBeGreaterThan(0n);

                        // Verify BPT output is within acceptable tolerance
                        areBigIntsWithinPercent(
                            maxAdjustableTokenDelta,
                            maxAdjustableAmountGiven,
                            0.0001, // 0.01% tolerance
                        );

                        if (ENABLE_LOGGING) {
                            appendFileSync(
                                `${fileName}.log`,
                                `${JSON.stringify({
                                    ...logBase,
                                    passed: true,
                                    maxAdjustableAmountIn:
                                        maxAdjustableAmountGiven.toString(),
                                    exactAmountIn:
                                        exactAmountInCalculated.toString(),
                                    deltaRaw: deltaRaw.toString(),
                                    deltaPct: deltaPct,
                                    bptOut: queryOutput.bptOut.amount.toString(),
                                    transactionExecuted: true,
                                    bptDelta: bptDelta.toString(),
                                    maxAdjustableDelta:
                                        maxAdjustableTokenDelta.toString(),
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
                                `${fileName}.log`,
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
