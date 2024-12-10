// pnpm test -- v3/addLiquidityBoosted/addLiquidityBoosted.integration.test.ts

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
    AddLiquidityKind,
    Slippage,
    Hex,
    CHAINS,
    ChainId,
    AddLiquidityBoostedV3,
    Permit2Helper,
    PERMIT2,
    Token,
    PublicWalletClient,
    AddLiquidityBoostedBuildCallInput,
    AddLiquidityBoostedInput,
} from '../../../src';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
    areBigIntsWithinPercent,
    TOKENS,
    assertTokenMatch,
    sendTransactionGetBalances,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { boostedPool_USDC_USDT } from 'test/mockData/boostedPool';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const USDC = TOKENS[chainId].USDC_AAVE;
const USDT = TOKENS[chainId].USDT_AAVE;

describe('Boosted AddLiquidity', () => {
    let client: PublicWalletClient & TestActions;
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;
    const addLiquidityBoosted = new AddLiquidityBoostedV3();

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        await setTokenBalances(
            client,
            testAddress,
            [USDT.address, USDC.address] as Address[],
            [USDT.slot, USDC.slot] as number[],
            [
                parseUnits('100', USDT.decimals),
                parseUnits('100', USDC.decimals),
            ],
        );

        // approve Permit2 to spend users DAI/USDC
        // does not include the sub approvals
        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDT.address, USDC.address] as Address[],
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

    describe('permit 2 direct approval', () => {
        beforeEach(async () => {
            // Here We approve the Vault to spend Tokens on the users behalf via Permit2
            await approveTokens(
                client,
                testAddress as Address,
                [USDT.address, USDC.address] as Address[],
                protocolVersion,
            );
        });
        describe('add liquidity unbalanced', () => {
            test('with tokens', async () => {
                const input: AddLiquidityBoostedInput = {
                    chainId,
                    rpcUrl,
                    amountsIn: [
                        {
                            rawAmount: 1000000n,
                            decimals: 6,
                            address: USDC.address as Address,
                        },
                        {
                            rawAmount: 1000000n,
                            decimals: 6,
                            address: USDT.address as Address,
                        },
                    ],
                    kind: AddLiquidityKind.Unbalanced,
                    userData: '0x',
                };

                const addLiquidityQueryOutput = await addLiquidityBoosted.query(
                    input,
                    boostedPool_USDC_USDT,
                );

                const addLiquidityBuildInput: AddLiquidityBoostedBuildCallInput =
                    {
                        ...addLiquidityQueryOutput,
                        slippage: Slippage.fromPercentage('1'),
                    };

                const addLiquidityBuildCallOutput =
                    await addLiquidityBoosted.buildCall(addLiquidityBuildInput);

                const { transactionReceipt, balanceDeltas } =
                    await sendTransactionGetBalances(
                        [
                            addLiquidityQueryOutput.bptOut.token.address,
                            USDC.address as `0x${string}`,
                            USDT.address as `0x${string}`,
                        ],
                        client,
                        testAddress,
                        addLiquidityBuildCallOutput.to,
                        addLiquidityBuildCallOutput.callData,
                    );

                expect(transactionReceipt.status).to.eq('success');

                expect(addLiquidityQueryOutput.bptOut.amount > 0n).to.be.true;

                areBigIntsWithinPercent(
                    addLiquidityQueryOutput.bptOut.amount,
                    balanceDeltas[0],
                    0.001,
                );

                const slippageAdjustedQueryOutput = Slippage.fromPercentage(
                    '1',
                ).applyTo(addLiquidityQueryOutput.bptOut.amount, -1);

                expect(
                    slippageAdjustedQueryOutput ===
                        addLiquidityBuildCallOutput.minBptOut.amount,
                ).to.be.true;
            });
        });
        describe('add liquidity proportional', () => {
            test('with bpt', async () => {
                const addLiquidityProportionalInput: AddLiquidityBoostedInput =
                    {
                        chainId,
                        rpcUrl,
                        referenceAmount: {
                            rawAmount: 1000000000000000000n,
                            decimals: 18,
                            address: boostedPool_USDC_USDT.address,
                        },
                        kind: AddLiquidityKind.Proportional,
                    };
                const addLiquidityQueryOutput = await addLiquidityBoosted.query(
                    addLiquidityProportionalInput,
                    boostedPool_USDC_USDT,
                );
                const addLiquidityBuildInput: AddLiquidityBoostedBuildCallInput =
                    {
                        ...addLiquidityQueryOutput,
                        slippage: Slippage.fromPercentage('1'),
                    };

                const addLiquidityBuildCallOutput =
                    addLiquidityBoosted.buildCall(addLiquidityBuildInput);

                const { transactionReceipt, balanceDeltas } =
                    await sendTransactionGetBalances(
                        [
                            addLiquidityQueryOutput.bptOut.token.address,
                            USDC.address as `0x${string}`,
                            USDT.address as `0x${string}`,
                        ],
                        client,
                        testAddress,
                        addLiquidityBuildCallOutput.to, //
                        addLiquidityBuildCallOutput.callData,
                    );

                expect(transactionReceipt.status).to.eq('success');

                addLiquidityQueryOutput.amountsIn.map((a) => {
                    expect(a.amount > 0n).to.be.true;
                });

                const expectedDeltas = [
                    addLiquidityProportionalInput.referenceAmount.rawAmount,
                    ...addLiquidityQueryOutput.amountsIn.map(
                        (tokenAmount) => tokenAmount.amount,
                    ),
                ];
                expect(balanceDeltas).to.deep.eq(expectedDeltas);

                const slippageAdjustedQueryInput =
                    addLiquidityQueryOutput.amountsIn.map((amountsIn) => {
                        return Slippage.fromPercentage('1').applyTo(
                            amountsIn.amount,
                            1,
                        );
                    });
                expect(
                    addLiquidityBuildCallOutput.maxAmountsIn.map(
                        (a) => a.amount,
                    ),
                ).to.deep.eq(slippageAdjustedQueryInput);

                // make sure to pass Tokens in correct order. Same as poolTokens but as underlyings instead
                assertTokenMatch(
                    [
                        new Token(
                            111555111,
                            USDC.address as Address,
                            USDC.decimals,
                        ),
                        new Token(
                            111555111,
                            USDT.address as Address,
                            USDT.decimals,
                        ),
                    ],
                    addLiquidityBuildCallOutput.maxAmountsIn.map(
                        (a) => a.token,
                    ),
                );
            });
            test('with reference token (non bpt)', async () => {
                const addLiquidityProportionalInput: AddLiquidityBoostedInput =
                    {
                        chainId,
                        rpcUrl,
                        referenceAmount: {
                            rawAmount: 481201n,
                            decimals: 6,
                            address: USDC.address,
                        },
                        kind: AddLiquidityKind.Proportional,
                    };
                const addLiquidityQueryOutput = await addLiquidityBoosted.query(
                    addLiquidityProportionalInput,
                    boostedPool_USDC_USDT,
                );
                const addLiquidityBuildInput: AddLiquidityBoostedBuildCallInput =
                    {
                        ...addLiquidityQueryOutput,
                        slippage: Slippage.fromPercentage('1'),
                    };

                const addLiquidityBuildCallOutput =
                    addLiquidityBoosted.buildCall(addLiquidityBuildInput);

                const { transactionReceipt, balanceDeltas } =
                    await sendTransactionGetBalances(
                        [
                            addLiquidityQueryOutput.bptOut.token.address,
                            USDC.address as `0x${string}`,
                            USDT.address as `0x${string}`,
                        ],
                        client,
                        testAddress,
                        addLiquidityBuildCallOutput.to, //
                        addLiquidityBuildCallOutput.callData,
                    );

                expect(transactionReceipt.status).to.eq('success');

                addLiquidityQueryOutput.amountsIn.map((a) => {
                    expect(a.amount > 0n).to.be.true;
                });

                const expectedDeltas = [
                    addLiquidityQueryOutput.bptOut.amount,
                    ...addLiquidityQueryOutput.amountsIn.map(
                        (tokenAmount) => tokenAmount.amount,
                    ),
                ];
                expect(balanceDeltas).to.deep.eq(expectedDeltas);

                const slippageAdjustedQueryInput =
                    addLiquidityQueryOutput.amountsIn.map((amountsIn) => {
                        return Slippage.fromPercentage('1').applyTo(
                            amountsIn.amount,
                            1,
                        );
                    });
                expect(
                    addLiquidityBuildCallOutput.maxAmountsIn.map(
                        (a) => a.amount,
                    ),
                ).to.deep.eq(slippageAdjustedQueryInput);

                // make sure to pass Tokens in correct order. Same as poolTokens but as underlyings instead
                assertTokenMatch(
                    [
                        new Token(
                            111555111,
                            USDC.address as Address,
                            USDC.decimals,
                        ),
                        new Token(
                            111555111,
                            USDT.address as Address,
                            USDT.decimals,
                        ),
                    ],
                    addLiquidityBuildCallOutput.maxAmountsIn.map(
                        (a) => a.token,
                    ),
                );
            });
        });
    });

    describe('permit 2 signatures', () => {
        describe('add liquidity unbalanced', () => {
            test('token inputs', async () => {
                const input: AddLiquidityBoostedInput = {
                    chainId,
                    rpcUrl,
                    amountsIn: [
                        {
                            rawAmount: 1000000n,
                            decimals: 6,
                            address: USDC.address as Address,
                        },
                        {
                            rawAmount: 1000000n,
                            decimals: 6,
                            address: USDT.address as Address,
                        },
                    ],
                    kind: AddLiquidityKind.Unbalanced,
                };

                const addLiquidityQueryOutput = await addLiquidityBoosted.query(
                    input,
                    boostedPool_USDC_USDT,
                );

                const addLiquidityBuildInput = {
                    ...addLiquidityQueryOutput,
                    slippage: Slippage.fromPercentage('1'),
                } as AddLiquidityBoostedBuildCallInput;

                const permit2 =
                    await Permit2Helper.signAddLiquidityBoostedApproval({
                        ...addLiquidityBuildInput,
                        client,
                        owner: testAddress,
                    });

                const addLiquidityBuildCallOutput =
                    await addLiquidityBoosted.buildCallWithPermit2(
                        addLiquidityBuildInput,
                        permit2,
                    );

                const { transactionReceipt, balanceDeltas } =
                    await sendTransactionGetBalances(
                        [
                            addLiquidityQueryOutput.bptOut.token.address,
                            USDC.address as `0x${string}`,
                            USDT.address as `0x${string}`,
                        ],
                        client,
                        testAddress,
                        addLiquidityBuildCallOutput.to,
                        addLiquidityBuildCallOutput.callData,
                    );

                expect(transactionReceipt.status).to.eq('success');

                expect(addLiquidityQueryOutput.bptOut.amount > 0n).to.be.true;

                areBigIntsWithinPercent(
                    addLiquidityQueryOutput.bptOut.amount,
                    balanceDeltas[0],
                    0.001,
                );

                const slippageAdjustedQueryOutput = Slippage.fromPercentage(
                    '1',
                ).applyTo(addLiquidityQueryOutput.bptOut.amount, -1);

                expect(
                    slippageAdjustedQueryOutput ===
                        addLiquidityBuildCallOutput.minBptOut.amount,
                ).to.be.true;
            });
        });
        describe('add liquidity proportional', () => {
            test('token inputs', async () => {
                const addLiquidityProportionalInput: AddLiquidityBoostedInput =
                    {
                        chainId,
                        rpcUrl,
                        referenceAmount: {
                            rawAmount: 1000000000000000000n,
                            decimals: 18,
                            address: boostedPool_USDC_USDT.address,
                        },
                        kind: AddLiquidityKind.Proportional,
                    };

                const addLiquidityQueryOutput = await addLiquidityBoosted.query(
                    addLiquidityProportionalInput,
                    boostedPool_USDC_USDT,
                );
                const addLiquidityBuildInput: AddLiquidityBoostedBuildCallInput =
                    {
                        ...addLiquidityQueryOutput,
                        slippage: Slippage.fromPercentage('1'),
                    };

                const permit2 =
                    await Permit2Helper.signAddLiquidityBoostedApproval({
                        ...addLiquidityBuildInput,
                        client,
                        owner: testAddress,
                    });

                const addLiquidityBuildCallOutput =
                    await addLiquidityBoosted.buildCallWithPermit2(
                        addLiquidityBuildInput,
                        permit2,
                    );

                const { transactionReceipt, balanceDeltas } =
                    await sendTransactionGetBalances(
                        [
                            addLiquidityQueryOutput.bptOut.token.address,
                            USDC.address as `0x${string}`,
                            USDT.address as `0x${string}`,
                        ],
                        client,
                        testAddress,
                        addLiquidityBuildCallOutput.to, //
                        addLiquidityBuildCallOutput.callData,
                    );

                expect(transactionReceipt.status).to.eq('success');

                addLiquidityQueryOutput.amountsIn.map((a) => {
                    expect(a.amount > 0n).to.be.true;
                });

                const expectedDeltas = [
                    addLiquidityProportionalInput.referenceAmount.rawAmount,
                    ...addLiquidityQueryOutput.amountsIn.map(
                        (tokenAmount) => tokenAmount.amount,
                    ),
                ];
                expect(balanceDeltas).to.deep.eq(expectedDeltas);

                const slippageAdjustedQueryInput =
                    addLiquidityQueryOutput.amountsIn.map((amountsIn) => {
                        return Slippage.fromPercentage('1').applyTo(
                            amountsIn.amount,
                            1,
                        );
                    });
                expect(
                    addLiquidityBuildCallOutput.maxAmountsIn.map(
                        (a) => a.amount,
                    ),
                ).to.deep.eq(slippageAdjustedQueryInput);

                // make sure to pass Tokens in correct order. Same as poolTokens but as underlyings instead
                assertTokenMatch(
                    [
                        new Token(
                            111555111,
                            USDC.address as Address,
                            USDC.decimals,
                        ),
                        new Token(
                            111555111,
                            USDT.address as Address,
                            USDT.decimals,
                        ),
                    ],
                    addLiquidityBuildCallOutput.maxAmountsIn.map(
                        (a) => a.token,
                    ),
                );
            });
        });
    });
});
