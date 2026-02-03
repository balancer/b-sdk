// pnpm test v3/addLiquidityUnbalancedViaSwap/addLiquidityUnbalancedViaSwap.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    createTestClient,
    formatEther,
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
    MathSol,
    PoolTokenWithBalance,
    Permit2Helper,
} from '@/index';
import {
    AddLiquidityUnbalancedViaSwapV3,
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
} from '@/entities/addLiquidityUnbalancedViaSwap';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    POOLS,
    TOKENS,
    sendTransactionGetBalances,
    forkSetup,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.MAINNET;
const poolId: Address = POOLS[chainId].AAVE_WETH.id;

const AAVE = TOKENS[chainId].AAVE;
const WETH = TOKENS[chainId].WETH;

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
        describe('explore wide range of amounts in', () => {
            const FRACTIONS = [
                { label: '0.1%', num: 1n, den: 1000n },
                { label: '1%', num: 1n, den: 100n },
                { label: '10%', num: 1n, den: 10n },
                { label: '50%', num: 1n, den: 2n },
                { label: '100%', num: 1n, den: 1n },
            ] as const;

            let expectedAdjustableTokenBalanceRaw: bigint;
            let expectedAdjustableToken: PoolTokenWithBalance;

            beforeAll(async () => {
                const poolStateWithBalances = await getPoolStateWithBalancesV3(
                    poolState,
                    chainId,
                    rpcUrl,
                );

                expectedAdjustableToken = poolStateWithBalances.tokens.find(
                    (t) => isSameAddress(t.address, AAVE.address),
                ) as PoolTokenWithBalance;

                expectedAdjustableTokenBalanceRaw = parseUnits(
                    expectedAdjustableToken.balance,
                    expectedAdjustableToken.decimals,
                );
            });

            for (const { label, num, den } of FRACTIONS) {
                test(`ReClamm single-sided adjustable with AAVE budget = ${label} of pool AAVE balance`, async () => {
                    const expectedAdjustableAmountGiven =
                        (expectedAdjustableTokenBalanceRaw * num) / den;

                    const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput =
                        {
                            chainId,
                            rpcUrl,
                            expectedAdjustableAmountIn: {
                                // adjustable token (AAVE) budget as a fraction of pool AAVE balance
                                rawAmount: expectedAdjustableAmountGiven,
                                decimals: AAVE.decimals,
                                address: AAVE.address,
                            },
                            addLiquidityUserData: '0x',
                            sender: testAddress,
                        };

                    const queryOutput =
                        await addLiquidityUnbalancedViaSwap.query(
                            addLiquidityInput,
                            poolState,
                        );

                    // Exact token is WETH with exactAmount = 0
                    expect(
                        queryOutput.exactAmountIn.token.address.toLowerCase(),
                    ).toBe(WETH.address.toLowerCase());
                    expect(queryOutput.exactAmountIn.amount).toBe(0n);

                    // Adjustable token is AAVE with some positive amount, within the budget
                    const expectedAdjustableAmountInCalculated =
                        queryOutput.expectedAdjustableAmountIn.amount;
                    expect(expectedAdjustableAmountInCalculated).toEqual(
                        expectedAdjustableAmountGiven,
                    );

                    // Execute the transaction
                    const buildCallInput = {
                        ...queryOutput,
                        slippage: Slippage.fromPercentage('1'), // 1% slippage
                        deadline: maxUint256,
                    };

                    const buildCallOutput =
                        addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);

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

                    // Verify input token amounts (WETH should be 0, AAVE should be used)
                    const adjustableTokenDelta =
                        balanceDeltas[expectedAdjustableToken.index];
                    const exactTokenDelta =
                        balanceDeltas[
                            expectedAdjustableToken.index === 0 ? 1 : 0
                        ];
                    const bptDelta = balanceDeltas[2];

                    expect(exactTokenDelta).toBe(0n);
                    expect(adjustableTokenDelta).toBeGreaterThan(0n);
                    expect(bptDelta).toBeGreaterThan(0n);

                    // Verify BPT output is within acceptable tolerance
                    const actualVersusExpectedRatio = Number(
                        formatEther(
                            MathSol.divDownFixed(
                                adjustableTokenDelta,
                                buildCallOutput.expectedAdjustableAmountIn
                                    .amount,
                            ),
                        ),
                    );

                    expect(actualVersusExpectedRatio).toBeCloseTo(1, 3); // 0.1% tolerance
                });
            }
        });
    });

    describe('permit2 signature', () => {
        let expectedAdjustableTokenBalanceRaw: bigint;
        let expectedAdjustableToken: PoolTokenWithBalance;

        beforeAll(async () => {
            const poolStateWithBalances = await getPoolStateWithBalancesV3(
                poolState,
                chainId,
                rpcUrl,
            );

            expectedAdjustableToken = poolStateWithBalances.tokens.find((t) =>
                isSameAddress(t.address, AAVE.address),
            ) as PoolTokenWithBalance;

            expectedAdjustableTokenBalanceRaw = parseUnits(
                expectedAdjustableToken.balance,
                expectedAdjustableToken.decimals,
            );
        });

        test('buildCallWithPermit2', async () => {
            const expectedAdjustableAmountGiven =
                expectedAdjustableTokenBalanceRaw / 100n;

            const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                chainId,
                rpcUrl,
                expectedAdjustableAmountIn: {
                    // adjustable token (AAVE) budget as a fraction of pool AAVE balance
                    rawAmount: expectedAdjustableAmountGiven,
                    decimals: AAVE.decimals,
                    address: AAVE.address,
                },
                addLiquidityUserData: '0x',
                sender: testAddress,
            };

            const queryOutput = await addLiquidityUnbalancedViaSwap.query(
                addLiquidityInput,
                poolState,
            );

            // Exact token is WETH with exactAmount = 0
            expect(queryOutput.exactAmountIn.token.address.toLowerCase()).toBe(
                WETH.address.toLowerCase(),
            );
            expect(queryOutput.exactAmountIn.amount).toBe(0n);

            // Adjustable token is AAVE with some positive amount, within the budget
            const expectedAdjustableAmountInCalculated =
                queryOutput.expectedAdjustableAmountIn.amount;
            expect(expectedAdjustableAmountInCalculated).toEqual(
                expectedAdjustableAmountGiven,
            );

            // Execute the transaction
            const buildCallInput: AddLiquidityUnbalancedViaSwapBuildCallInput =
                {
                    ...queryOutput,
                    slippage: Slippage.fromPercentage('1'), // 1% slippage
                    deadline: maxUint256,
                };

            const permit2 =
                await Permit2Helper.signAddLiquidityUnbalancedViaSwapApproval({
                    ...buildCallInput,
                    client,
                    owner: testAddress,
                });

            const buildCallOutput =
                addLiquidityUnbalancedViaSwap.buildCallWithPermit2(
                    buildCallInput,
                    permit2,
                );

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

            // Verify max adjustable input token amount is within acceptable tolerance
            const adjustableTokenDelta =
                balanceDeltas[expectedAdjustableToken.index];
            const exactTokenDelta =
                balanceDeltas[expectedAdjustableToken.index === 0 ? 1 : 0];
            const bptDelta = balanceDeltas[2];

            expect(exactTokenDelta).toBe(0n);
            expect(adjustableTokenDelta).toBeGreaterThan(0n);
            expect(bptDelta).toEqual(queryOutput.bptOut.amount);

            // Verify BPT output is within acceptable tolerance
            const actualVersusExpectedRatio = Number(
                formatEther(
                    MathSol.divDownFixed(
                        adjustableTokenDelta,
                        buildCallOutput.expectedAdjustableAmountIn.amount,
                    ),
                ),
            );

            expect(actualVersusExpectedRatio).toBeCloseTo(1, 3); // 0.1% tolerance
        });
    });
});
