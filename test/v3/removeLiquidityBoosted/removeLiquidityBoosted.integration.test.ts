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
    AddLiquidityProportionalInput,
    AddLiquidityKind,
    RemoveLiquidityKind,
    Slippage,
    Hex,
    CHAINS,
    ChainId,
    AddLiquidityInput,
    PERMIT2,
    Token,
    PublicWalletClient,
    AddLiquidityBoostedV3,
    RemoveLiquidityBoostedV3,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    RemoveLiquidityBoostedProportionalInput,
    PermitHelper,
} from 'src';
import {
    AddLiquidityTxInput,
    doAddLiquidity,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
    sendTransactionGetBalances,
    assertTokenMatch,
    TOKENS,
    areBigIntsWithinPercent,
} from '../../lib/utils';

import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { boostedPool_USDC_USDT } from 'test/mockData/boostedPool';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
const USDC = TOKENS[chainId].USDC_AAVE;
const USDT = TOKENS[chainId].USDT_AAVE;

describe('remove liquidity test', () => {
    let client: PublicWalletClient & TestActions;
    let txInput: AddLiquidityTxInput;
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;

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

        // subapprovals for permit2 to the vault
        // fine to do before each because it does not impact the
        // requirement for BPT permits. (which are permits, not permit2)
        // Here We approve the Vault to spend Tokens on the users behalf via Permit2
        await approveTokens(
            client,
            testAddress as Address,
            [USDT.address, USDC.address] as Address[],
            protocolVersion,
        );

        // join the pool - via direct approval
        const slippage: Slippage = Slippage.fromPercentage('1');

        txInput = {
            client,
            addLiquidity: new AddLiquidityBoostedV3(),
            slippage: slippage,
            poolState: boostedPool_USDC_USDT,
            testAddress,
            addLiquidityInput: {} as AddLiquidityInput,
        };

        const input: AddLiquidityProportionalInput = {
            chainId: chainId,
            rpcUrl: rpcUrl,
            referenceAmount: {
                rawAmount: 1000000000000000000n,
                decimals: 18,
                address: boostedPool_USDC_USDT.address,
            },
            kind: AddLiquidityKind.Proportional,
        };

        const _addLiquidityOutput = await doAddLiquidity({
            ...txInput,
            addLiquidityInput: input,
        });
    });
    describe('direct approval', () => {
        beforeEach(async () => {
            // Approve the Composite liquidity router.
            await approveSpenderOnTokens(
                client,
                testAddress,
                [boostedPool_USDC_USDT.address] as Address[],
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
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
                    kind: RemoveLiquidityKind.Proportional,
                    userAddress: testAddress,
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
