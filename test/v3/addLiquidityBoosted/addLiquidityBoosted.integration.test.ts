// pnpm test -- v3/addLiquidityBoosted/addLiquidityBoosted.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    createTestClient,
    erc4626Abi,
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
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
    AddLiquidityBoostedUnbalancedInput,
    AddLiquidityBoostedProportionalInput,
    TokenAmount,
} from '../../../src';
import {
    setTokenBalances,
    approveSpenderOnTokens,
    approveSpenderOnPermit2,
    areBigIntsWithinPercent,
    TOKENS,
    assertTokenMatch,
    sendTransactionGetBalances,
    doAddLiquidityBoosted,
    assertAddLiquidityBoostedUnbalanced,
    assertAddLiquidityBoostedProportional,
    AddLiquidityBoostedTxInput,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { boostedPool_USDC_USDT } from 'test/mockData/boostedPool';

const chainId = ChainId.SEPOLIA;
const USDC = TOKENS[chainId].USDC_AAVE;
const USDT = TOKENS[chainId].USDT_AAVE;
const stataUSDT = TOKENS[chainId].stataUSDT;

// These are the underlying tokens
const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const usdcToken = new Token(chainId, USDC.address, USDC.decimals);

describe('Boosted AddLiquidity', () => {
    let client: PublicWalletClient & TestActions;
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;
    const addLiquidityBoosted = new AddLiquidityBoostedV3();
    const amountsIn = [
        TokenAmount.fromHumanAmount(usdcToken, '1'),
        TokenAmount.fromHumanAmount(usdtToken, '1'),
    ];

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
                parseUnits('1000', USDT.decimals),
                parseUnits('1000', USDC.decimals),
            ],
        );

        // set erc4626 token balance
        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDT.address],
            stataUSDT.address,
        );
        await client.writeContract({
            account: testAddress,
            chain: CHAINS[chainId],
            abi: erc4626Abi,
            address: stataUSDT.address,
            functionName: 'deposit',
            args: [parseUnits('500', USDT.decimals), testAddress],
        });

        // approve Permit2 to spend users DAI/USDC, does not include the sub approvals
        await approveSpenderOnTokens(
            client,
            testAddress,
            [USDT.address, USDC.address, stataUSDT.address] as Address[],
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

    test('query returns correct token addresses', async () => {
        const referenceAmount = {
            rawAmount: 481201n,
            decimals: 6,
            address: USDC.address,
        };
        const wrapUnderlying = [true, false];

        const addLiquidityBoostedInput: AddLiquidityBoostedProportionalInput = {
            chainId,
            rpcUrl,
            referenceAmount,
            wrapUnderlying,
            kind: AddLiquidityKind.Proportional,
        };

        const addLiquidityQueryOutput = await addLiquidityBoosted.query(
            addLiquidityBoostedInput,
            boostedPool_USDC_USDT,
        );

        const amountsIn = addLiquidityQueryOutput.amountsIn;

        expect(amountsIn[0].token.address).to.eq(usdcToken.address);
        expect(amountsIn[1].token.address).to.eq(stataUSDT.address);
    });

    describe('permit 2 direct approval', () => {
        beforeEach(async () => {
            // Here we approve the Vault to spend tokens on the users behalf via Permit2
            for (const token of boostedPool_USDC_USDT.tokens) {
                await approveSpenderOnPermit2(
                    client,
                    testAddress,
                    token.address,
                    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
                );

                if (token.underlyingToken) {
                    await approveSpenderOnPermit2(
                        client,
                        testAddress,
                        token.underlyingToken.address,
                        BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
                    );
                }
            }
        });
        describe('unbalanced', () => {
            test('with both underlying tokens wrapped', async () => {
                const wrapUnderlying = [true, true];
                const wethIsEth = false;
                const addLiquidityBoostedInput: AddLiquidityBoostedUnbalancedInput =
                    {
                        chainId,
                        rpcUrl,
                        amountsIn: amountsIn.map((a) => ({
                            address: a.token.address,
                            rawAmount: a.amount,
                            decimals: a.token.decimals,
                        })),
                        wrapUnderlying,
                        kind: AddLiquidityKind.Unbalanced,
                    };

                const txInput: AddLiquidityBoostedTxInput = {
                    client,
                    addLiquidityBoosted,
                    addLiquidityBoostedInput,
                    testAddress,
                    poolStateWithUnderlyings: boostedPool_USDC_USDT,
                    slippage: Slippage.fromPercentage('1'),
                    wethIsEth,
                };

                const {
                    addLiquidityBoostedQueryOutput,
                    addLiquidityBuildCallOutput,
                    tokenAmountsForBalanceCheck,
                    txOutput,
                } = await doAddLiquidityBoosted(txInput);

                assertAddLiquidityBoostedUnbalanced(
                    {
                        addLiquidityBoostedQueryOutput,
                        addLiquidityBuildCallOutput,
                        tokenAmountsForBalanceCheck,
                        txOutput,
                    },
                    wethIsEth,
                );
            });

            test('with only one underlying token wrapped', async () => {
                const wrapUnderlying = [true, false];
                const wethIsEth = false;
                const addLiquidityBoostedInput: AddLiquidityBoostedUnbalancedInput =
                    {
                        chainId,
                        rpcUrl,
                        amountsIn: [
                            {
                                address: USDC.address,
                                rawAmount: 1000000n,
                                decimals: USDC.decimals,
                            },
                            {
                                address: stataUSDT.address,
                                rawAmount: 2000000n,
                                decimals: stataUSDT.decimals,
                            },
                        ],
                        wrapUnderlying,
                        kind: AddLiquidityKind.Unbalanced,
                    };

                const txInput: AddLiquidityBoostedTxInput = {
                    client,
                    addLiquidityBoosted,
                    addLiquidityBoostedInput,
                    testAddress,
                    poolStateWithUnderlyings: boostedPool_USDC_USDT,
                    slippage: Slippage.fromPercentage('1'),
                    wethIsEth,
                };

                const {
                    addLiquidityBoostedQueryOutput,
                    addLiquidityBuildCallOutput,
                    tokenAmountsForBalanceCheck,
                    txOutput,
                } = await doAddLiquidityBoosted(txInput);

                assertAddLiquidityBoostedUnbalanced(
                    {
                        addLiquidityBoostedQueryOutput,
                        addLiquidityBuildCallOutput,
                        tokenAmountsForBalanceCheck,
                        txOutput,
                    },
                    wethIsEth,
                );
            });
        });
        describe('proportional', () => {
            test('with bpt as reference token', async () => {
                const referenceAmount = {
                    rawAmount: 1000000000000000000n,
                    decimals: 18,
                    address: boostedPool_USDC_USDT.address,
                };
                const wrapUnderlying = [true, true];
                const wethIsEth = false;

                const addLiquidityBoostedInput: AddLiquidityBoostedProportionalInput =
                    {
                        chainId,
                        rpcUrl,
                        referenceAmount,
                        wrapUnderlying,
                        kind: AddLiquidityKind.Proportional,
                    };

                const txInput: AddLiquidityBoostedTxInput = {
                    client,
                    addLiquidityBoosted,
                    addLiquidityBoostedInput,
                    testAddress,
                    poolStateWithUnderlyings: boostedPool_USDC_USDT,
                    slippage: Slippage.fromPercentage('1'),
                    wethIsEth,
                };

                const {
                    addLiquidityBoostedQueryOutput,
                    addLiquidityBuildCallOutput,
                    tokenAmountsForBalanceCheck,
                    txOutput,
                } = await doAddLiquidityBoosted(txInput);

                assertAddLiquidityBoostedProportional(
                    {
                        addLiquidityBoostedQueryOutput,
                        addLiquidityBuildCallOutput,
                        tokenAmountsForBalanceCheck,
                        txOutput,
                    },
                    wethIsEth,
                );
            });
            test('with underlying as reference token', async () => {
                const referenceAmount = {
                    rawAmount: 481201n,
                    decimals: 6,
                    address: USDC.address,
                };
                const wrapUnderlying = [true, true];
                const wethIsEth = false;

                const addLiquidityBoostedInput: AddLiquidityBoostedProportionalInput =
                    {
                        chainId,
                        rpcUrl,
                        referenceAmount,
                        wrapUnderlying,
                        kind: AddLiquidityKind.Proportional,
                    };
                const txInput: AddLiquidityBoostedTxInput = {
                    client,
                    addLiquidityBoosted,
                    addLiquidityBoostedInput,
                    testAddress,
                    poolStateWithUnderlyings: boostedPool_USDC_USDT,
                    slippage: Slippage.fromPercentage('1'),
                    wethIsEth,
                };

                const {
                    addLiquidityBoostedQueryOutput,
                    addLiquidityBuildCallOutput,
                    tokenAmountsForBalanceCheck,
                    txOutput,
                } = await doAddLiquidityBoosted(txInput);

                assertAddLiquidityBoostedProportional(
                    {
                        addLiquidityBoostedQueryOutput,
                        addLiquidityBuildCallOutput,
                        tokenAmountsForBalanceCheck,
                        txOutput,
                    },
                    wethIsEth,
                );
            });

            test('with only one underlying token wrapped', async () => {
                const referenceAmount = {
                    rawAmount: 481201n,
                    decimals: 6,
                    address: USDC.address,
                };
                const wrapUnderlying = [true, false];
                const wethIsEth = false;

                const addLiquidityBoostedInput: AddLiquidityBoostedProportionalInput =
                    {
                        chainId,
                        rpcUrl,
                        referenceAmount,
                        wrapUnderlying,
                        kind: AddLiquidityKind.Proportional,
                    };
                const txInput: AddLiquidityBoostedTxInput = {
                    client,
                    addLiquidityBoosted,
                    addLiquidityBoostedInput,
                    testAddress,
                    poolStateWithUnderlyings: boostedPool_USDC_USDT,
                    slippage: Slippage.fromPercentage('1'),
                    wethIsEth,
                };

                const {
                    addLiquidityBoostedQueryOutput,
                    addLiquidityBuildCallOutput,
                    tokenAmountsForBalanceCheck,
                    txOutput,
                } = await doAddLiquidityBoosted(txInput);

                assertAddLiquidityBoostedProportional(
                    {
                        addLiquidityBoostedQueryOutput,
                        addLiquidityBuildCallOutput,
                        tokenAmountsForBalanceCheck,
                        txOutput,
                    },
                    wethIsEth,
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
                    wrapUnderlying: [true, true],
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
        describe('proportional', () => {
            test('with tokens', async () => {
                const addLiquidityProportionalInput: AddLiquidityBoostedInput =
                    {
                        chainId,
                        rpcUrl,
                        referenceAmount: {
                            rawAmount: 1000000000000000000n,
                            decimals: 18,
                            address: boostedPool_USDC_USDT.address,
                        },
                        wrapUnderlying: [true, true],
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
