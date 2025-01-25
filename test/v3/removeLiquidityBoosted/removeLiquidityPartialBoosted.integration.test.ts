// pnpm test -- removeLiquidityPartialBoosted.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    Hex,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
    zeroAddress,
} from 'viem';

import {
    Address,
    ChainId,
    CHAINS,
    PublicWalletClient,
    Token,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
    Slippage,
    RemoveLiquidityBoostedV3,
    RemoveLiquidityBoostedProportionalInput,
    RemoveLiquidityKind,
    TokenAmount,
    NATIVE_ASSETS,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnToken,
    areBigIntsWithinPercent,
    GetBoostedBpt,
    sendTransactionGetBalances,
    TOKENS,
} from 'test/lib/utils';
import { validateTokenAmounts } from 'test/lib/utils/removeLiquidityNestedHelper';
import { partialBoostedPool_WETH_stataUSDT } from 'test/mockData/partialBoostedPool';

const chainId = ChainId.SEPOLIA;
const USDT = TOKENS[chainId].USDT_AAVE;
const WETH = TOKENS[chainId].WETH;

const parentBptToken = new Token(
    chainId,
    partialBoostedPool_WETH_stataUSDT.address,
    18,
);
// These are the underlying tokens
const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const wethToken = new Token(chainId, WETH.address, WETH.decimals);
const unwrapWrapped = [false, true]; // unwrapWrapped must match order of on chain state for pool tokens

describe('V3 remove liquidity partial boosted', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const removeLiquidityBoosted = new RemoveLiquidityBoostedV3();
    let bptAmount: bigint;
    let snapshot: Hex;

    let removeLiquidityInput: RemoveLiquidityBoostedProportionalInput;

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

        /*
        We can't use the slot method to set test address BPT balance so we add liquidity instead to get the BPT.
        */
        bptAmount = await GetBoostedBpt(
            chainId,
            rpcUrl,
            testAddress,
            client,
            partialBoostedPool_WETH_stataUSDT,
            [
                {
                    address: USDT.address,
                    rawAmount: parseUnits('10', USDT.decimals),
                    decimals: USDT.decimals,
                    slot: USDT.slot as number,
                },
                {
                    address: WETH.address,
                    rawAmount: parseUnits('0.02', WETH.decimals),
                    decimals: WETH.decimals,
                    slot: WETH.slot as number,
                },
            ],
            unwrapWrapped,
        );

        removeLiquidityInput = {
            chainId,
            rpcUrl,
            bptIn: {
                address: partialBoostedPool_WETH_stataUSDT.address,
                decimals: 18,
                rawAmount: bptAmount,
            },
            unwrapWrapped,
            kind: RemoveLiquidityKind.Proportional,
        };

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    test('query with underlying', async () => {
        const queryOutput = await removeLiquidityBoosted.query(
            removeLiquidityInput,
            partialBoostedPool_WETH_stataUSDT,
        );
        expect(queryOutput.poolType).to.eq(
            partialBoostedPool_WETH_stataUSDT.type,
        );
        expect(queryOutput.poolId).to.eq(
            partialBoostedPool_WETH_stataUSDT.address,
        );
        expect(queryOutput.chainId).to.eq(chainId);
        expect(queryOutput.userData).to.eq('0x');
        expect(queryOutput.protocolVersion).toEqual(3);
        expect(queryOutput.bptIn.token).to.deep.eq(parentBptToken);
        expect(queryOutput.bptIn.amount).to.eq(
            removeLiquidityInput.bptIn.rawAmount,
        );
        expect(queryOutput.amountsOut.length).to.eq(
            partialBoostedPool_WETH_stataUSDT.tokens.length,
        );
        validateTokenAmounts(queryOutput.amountsOut, [usdtToken, wethToken]);
    });

    describe('remove liquidity transaction', async () => {
        test('with tokens', async () => {
            // Removals do NOT use Permit2. Here we directly approve the Router to spend the users BPT using ERC20 approval
            await approveSpenderOnToken(
                client,
                testAddress,
                parentBptToken.address,
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
            );

            const queryOutput = await removeLiquidityBoosted.query(
                removeLiquidityInput,
                partialBoostedPool_WETH_stataUSDT,
            );

            const removeLiquidityBuildInput = {
                ...queryOutput,
                slippage: Slippage.fromPercentage('1'), // 1%,
            };

            const removeLiquidityBuildCallOutput =
                removeLiquidityBoosted.buildCall(removeLiquidityBuildInput);

            // Build call minAmountsOut should be query result with slippage applied
            const expectedMinAmountsOut = queryOutput.amountsOut.map(
                (amountOut) =>
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
            expect(removeLiquidityBuildCallOutput.to).to.eq(
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
            );

            // send remove liquidity transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    [
                        removeLiquidityInput.bptIn.address,
                        ...queryOutput.amountsOut.map((a) => a.token.address),
                    ],
                    client,
                    testAddress,
                    removeLiquidityBuildCallOutput.to,
                    removeLiquidityBuildCallOutput.callData,
                );
            expect(transactionReceipt.status).to.eq('success');
            // Should match user bpt amount in and query result for amounts out
            const expectedDeltas = [
                removeLiquidityInput.bptIn.rawAmount,
                ...queryOutput.amountsOut.map((amountOut) => amountOut.amount),
            ];
            // Here we check that output diff is within an acceptable tolerance as buffers can have difference in queries/result
            expectedDeltas.forEach((delta, i) => {
                areBigIntsWithinPercent(delta, balanceDeltas[i], 0.001);
            });
        });

        test('with native', async () => {
            const wethIsEth = true;
            // Removals do NOT use Permit2. Here we directly approve the Router to spend the users BPT using ERC20 approval
            await approveSpenderOnToken(
                client,
                testAddress,
                parentBptToken.address,
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
            );

            const queryOutput = await removeLiquidityBoosted.query(
                removeLiquidityInput,
                partialBoostedPool_WETH_stataUSDT,
            );

            const removeLiquidityBuildInput = {
                ...queryOutput,
                slippage: Slippage.fromPercentage('1'), // 1%
                wethIsEth,
            };

            const removeLiquidityBuildCallOutput =
                removeLiquidityBoosted.buildCall(removeLiquidityBuildInput);

            // Build call minAmountsOut should be query result with slippage applied
            const expectedMinAmountsOut = queryOutput.amountsOut.map(
                (amountOut) =>
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
            expect(removeLiquidityBuildCallOutput.to).to.eq(
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
            );

            const tokenAmountsForBalanceCheck = [
                ...queryOutput.amountsOut,
                queryOutput.bptIn,
                // add zero address so we can check for native token balance change
                TokenAmount.fromRawAmount(
                    new Token(queryOutput.chainId, zeroAddress, 18),
                    0n,
                ),
            ];

            // send remove liquidity transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    tokenAmountsForBalanceCheck.map((a) => a.token.address),
                    client,
                    testAddress,
                    removeLiquidityBuildCallOutput.to,
                    removeLiquidityBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');
            // Should match user bpt amount in and query result for amounts out

            // add one extra index for native token balance
            const expectedDeltas = tokenAmountsForBalanceCheck.map(
                (t) => t.amount,
            );

            // move native token balance to the extra index if wethIsEth
            if (wethIsEth) {
                const wethIndex = queryOutput.amountsOut.findIndex((a) =>
                    a.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
                );
                expectedDeltas[expectedDeltas.length - 1] =
                    expectedDeltas[wethIndex];
                expectedDeltas[wethIndex] = 0n;
            }

            // Here we check that output diff is within an acceptable tolerance as buffers can have difference in queries/result
            expectedDeltas.forEach((delta, i) => {
                areBigIntsWithinPercent(delta, balanceDeltas[i], 0.001);
            });
        });
    });
});
