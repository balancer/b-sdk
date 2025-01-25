// pnpm test -- removeLiquidityBoosted.integration.test.ts

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
    AddLiquidityBoostedInput,
    AddLiquidityKind,
    RemoveLiquidityKind,
    Slippage,
    Hex,
    CHAINS,
    ChainId,
    PERMIT2,
    Token,
    PublicWalletClient,
    AddLiquidityBoostedV3,
    RemoveLiquidityBoostedV3,
    RemoveLiquidityBoostedProportionalInput,
    PermitHelper,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
} from 'src';
import {
    doAddLiquidity,
    setTokenBalances,
    approveSpenderOnTokens,
    approveSpenderOnPermit2,
    sendTransactionGetBalances,
    assertTokenMatch,
    TOKENS,
    areBigIntsWithinPercent,
} from '../../lib/utils';

import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { boostedPool_USDC_USDT } from 'test/mockData/boostedPool';

const chainId = ChainId.SEPOLIA;
const USDC = TOKENS[chainId].USDC_AAVE;
const USDT = TOKENS[chainId].USDT_AAVE;
const unwrapWrapped = [true, true]; // unwrapWrapped must match order of on chain state for pool tokens

describe('remove liquidity test', () => {
    let client: PublicWalletClient & TestActions;
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS[ChainId[chainId]],
            undefined,
            7562540n, // block after new composite liquidity router deployed
        ));

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

    // Add liquidity before each test to prepare for remove liquidity
    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();

        // Approve the Vault to spend Tokens on the users behalf via Permit2
        for (const token of boostedPool_USDC_USDT.tokens) {
            await approveSpenderOnPermit2(
                client,
                testAddress,
                token.underlyingToken?.address ?? token.address,
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
            );
        }

        const addLiquidityInput: AddLiquidityBoostedInput = {
            chainId: chainId,
            rpcUrl: rpcUrl,
            referenceAmount: {
                rawAmount: 1000000000000000000n,
                decimals: 18,
                address: boostedPool_USDC_USDT.address,
            },
            kind: AddLiquidityKind.Proportional,
            wrapUnderlying: [true, true],
        };

        await doAddLiquidity({
            client,
            addLiquidity: new AddLiquidityBoostedV3(), // TODO: debug linter type complaint
            addLiquidityInput,
            slippage: Slippage.fromPercentage('1'),
            poolState: boostedPool_USDC_USDT,
            testAddress,
        });
    });
    describe('direct approval', () => {
        beforeEach(async () => {
            // Approve the Composite liquidity router.
            await approveSpenderOnTokens(
                client,
                testAddress,
                [boostedPool_USDC_USDT.address] as Address[],
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
            );
        });
        test('remove liquidity proportional', async () => {
            const removeLiquidityBoostedV3 = new RemoveLiquidityBoostedV3();

            const removeLiquidityInput: RemoveLiquidityBoostedProportionalInput =
                {
                    chainId: chainId,
                    rpcUrl: rpcUrl,
                    bptIn: {
                        rawAmount: 1000000000000000000n,
                        decimals: 18,
                        address: boostedPool_USDC_USDT.address,
                    },
                    unwrapWrapped,
                    kind: RemoveLiquidityKind.Proportional,
                };

            const removeLiquidityQueryOutput =
                await removeLiquidityBoostedV3.query(
                    removeLiquidityInput,
                    boostedPool_USDC_USDT,
                );

            const removeLiquidityBuildInput = {
                ...removeLiquidityQueryOutput,
                slippage: Slippage.fromPercentage('1'),
            };

            const removeLiquidityBuildCallOutput =
                removeLiquidityBoostedV3.buildCall(removeLiquidityBuildInput);

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        boostedPool_USDC_USDT.address,
                        USDC.address as `0x${string}`,
                        USDT.address as `0x${string}`,
                    ],
                    client,
                    testAddress,
                    removeLiquidityBuildCallOutput.to,
                    removeLiquidityBuildCallOutput.callData,
                );
            expect(transactionReceipt.status).to.eq('success');
            expect(
                removeLiquidityQueryOutput.amountsOut.map((amount) => {
                    expect(amount.amount > 0).to.be.true;
                }),
            );

            const expectedDeltas = [
                removeLiquidityQueryOutput.bptIn.amount,
                ...removeLiquidityQueryOutput.amountsOut.map(
                    (amountOut) => amountOut.amount,
                ),
            ];
            // Here we check that output diff is within an acceptable tolerance as buffers can have difference in queries/result
            expectedDeltas.forEach((delta, i) => {
                areBigIntsWithinPercent(delta, balanceDeltas[i], 0.001);
            });
            const expectedMinAmountsOut =
                removeLiquidityQueryOutput.amountsOut.map((amountOut) =>
                    removeLiquidityBuildInput.slippage.applyTo(
                        amountOut.amount,
                        -1,
                    ),
                );
            expect(expectedMinAmountsOut).to.deep.eq(
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.amount,
                ),
            );

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
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.token,
                ),
            );
        });
    });
    describe('permit approval', () => {
        test('remove liquidity proportional', async () => {
            const removeLiquidityBoostedV3 = new RemoveLiquidityBoostedV3();

            const removeLiquidityInput: RemoveLiquidityBoostedProportionalInput =
                {
                    chainId: chainId,
                    rpcUrl: rpcUrl,
                    bptIn: {
                        rawAmount: 1000000000000000000n,
                        decimals: 18,
                        address: boostedPool_USDC_USDT.address,
                    },
                    unwrapWrapped,
                    kind: RemoveLiquidityKind.Proportional,
                    sender: testAddress,
                    userData: '0x123',
                };

            const removeLiquidityQueryOutput =
                await removeLiquidityBoostedV3.query(
                    removeLiquidityInput,
                    boostedPool_USDC_USDT,
                );

            const removeLiquidityBuildInput = {
                ...removeLiquidityQueryOutput,
                slippage: Slippage.fromPercentage('1'),
            };

            //
            const permit =
                await PermitHelper.signRemoveLiquidityBoostedApproval({
                    ...removeLiquidityBuildInput,
                    client,
                    owner: testAddress,
                });

            const removeLiquidityBuildCallOutput =
                removeLiquidityBoostedV3.buildCallWithPermit(
                    removeLiquidityBuildInput,
                    permit,
                );

            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        boostedPool_USDC_USDT.address,
                        USDC.address as `0x${string}`,
                        USDT.address as `0x${string}`,
                    ],
                    client,
                    testAddress,
                    removeLiquidityBuildCallOutput.to,
                    removeLiquidityBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');
            expect(
                removeLiquidityQueryOutput.amountsOut.map((amount) => {
                    expect(amount.amount > 0).to.be.true;
                }),
            );

            const expectedDeltas = [
                removeLiquidityQueryOutput.bptIn.amount,
                ...removeLiquidityQueryOutput.amountsOut.map(
                    (amountOut) => amountOut.amount,
                ),
            ];
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
            const expectedMinAmountsOut =
                removeLiquidityQueryOutput.amountsOut.map((amountOut) =>
                    removeLiquidityBuildInput.slippage.applyTo(
                        amountOut.amount,
                        -1,
                    ),
                );
            expect(expectedMinAmountsOut).to.deep.eq(
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.amount,
                ),
            );
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
                removeLiquidityBuildCallOutput.minAmountsOut.map(
                    (a) => a.token,
                ),
            );
        });
    });
});
