// pnpm test -- removeLiquidityNestedV3.integration.test.ts
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
    RemoveLiquidityNestedInput,
    RemoveLiquidityNested,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    Slippage,
    RemoveLiquidityNestedCallInputV3,
    TokenAmount,
    NATIVE_ASSETS,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    approveSpenderOnToken,
    sendTransactionGetBalances,
} from 'test/lib/utils';
import {
    GetNestedBpt,
    validateTokenAmounts,
} from 'test/lib/utils/removeNestedHelpers';
import {
    nestedWithBoostedPool,
    NESTED_WITH_BOOSTED_POOL,
    USDC,
    USDT,
    WETH,
} from 'test/mockData/nestedPool';

const chainId = ChainId.SEPOLIA;

const parentBptToken = new Token(
    chainId,
    NESTED_WITH_BOOSTED_POOL.address,
    NESTED_WITH_BOOSTED_POOL.decimals,
);
// These are the underlying tokens
const usdcToken = new Token(chainId, USDC.address, USDC.decimals);
const usdtToken = new Token(chainId, USDT.address, USDT.decimals);
const wethToken = new Token(chainId, WETH.address, WETH.decimals);
const mainTokens = [wethToken, usdtToken, usdcToken];

describe('V3 remove liquidity nested test, with Permit direct approval', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const removeLiquidityNested = new RemoveLiquidityNested();
    let bptAmount: bigint;
    let snapshot: Hex;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));

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
        bptAmount = await GetNestedBpt(
            chainId,
            rpcUrl,
            testAddress,
            client,
            nestedWithBoostedPool,
            [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('0.001', WETH.decimals),
                    decimals: WETH.decimals,
                    slot: WETH.slot as number,
                },
                {
                    address: USDC.address,
                    rawAmount: parseUnits('2', USDC.decimals),
                    decimals: USDC.decimals,
                    slot: USDC.slot as number,
                },
            ],
        );
        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    test('query with underlying', async () => {
        const removeLiquidityInput: RemoveLiquidityNestedInput = {
            bptAmountIn: bptAmount,
            chainId,
            rpcUrl,
        };
        const queryOutput = await removeLiquidityNested.query(
            removeLiquidityInput,
            nestedWithBoostedPool,
        );
        expect(queryOutput.protocolVersion).toEqual(3);
        expect(queryOutput.bptAmountIn.token).to.deep.eq(parentBptToken);
        expect(queryOutput.bptAmountIn.amount).to.eq(
            removeLiquidityInput.bptAmountIn,
        );
        expect(queryOutput.amountsOut.length).to.eq(
            nestedWithBoostedPool.mainTokens.length,
        );
        validateTokenAmounts(queryOutput.amountsOut, mainTokens);
    });

    describe('remove liquidity transaction, direct approval on router', async () => {
        test('with tokens', async () => {
            const removeLiquidityInput: RemoveLiquidityNestedInput = {
                bptAmountIn: bptAmount,
                chainId,
                rpcUrl,
            };

            // Removals do NOT use Permit2. Here we directly approave the Router to spend the users BPT using ERC20 approval
            await approveSpenderOnToken(
                client,
                testAddress,
                parentBptToken.address,
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            );

            const queryOutput = await removeLiquidityNested.query(
                removeLiquidityInput,
                nestedWithBoostedPool,
            );

            const removeLiquidityBuildInput = {
                ...queryOutput,
                slippage: Slippage.fromPercentage('1'), // 1%,
            } as RemoveLiquidityNestedCallInputV3;

            const addLiquidityBuildCallOutput = removeLiquidityNested.buildCall(
                removeLiquidityBuildInput,
            );

            // Build call minAmountsOut should be query result with slippage applied
            const expectedMinAmountsOut = queryOutput.amountsOut.map(
                (amountOut) =>
                    removeLiquidityBuildInput.slippage.applyTo(
                        amountOut.amount,
                        -1,
                    ),
            );
            expect(expectedMinAmountsOut).to.deep.eq(
                addLiquidityBuildCallOutput.minAmountsOut.map((a) => a.amount),
            );
            expect(addLiquidityBuildCallOutput.to).to.eq(
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            );

            const tokenAmountsForBalanceCheck = [
                ...queryOutput.amountsOut,
                queryOutput.bptAmountIn,
            ];

            // send remove liquidity transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    tokenAmountsForBalanceCheck.map((t) => t.token.address),
                    client,
                    testAddress,
                    addLiquidityBuildCallOutput.to,
                    addLiquidityBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');

            // Should match user bpt amount in and query result for amounts out
            const expectedDeltas = tokenAmountsForBalanceCheck.map(
                (t) => t.amount,
            );
            expect(expectedDeltas).to.deep.eq(balanceDeltas);
        });

        test('with native', async () => {
            const wethIsEth = true;
            const removeLiquidityInput: RemoveLiquidityNestedInput = {
                bptAmountIn: bptAmount,
                chainId,
                rpcUrl,
            };

            // Removals do NOT use Permit2. Here we directly approave the Router to spend the users BPT using ERC20 approval
            await approveSpenderOnToken(
                client,
                testAddress,
                parentBptToken.address,
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            );

            const queryOutput = await removeLiquidityNested.query(
                removeLiquidityInput,
                nestedWithBoostedPool,
            );

            const removeLiquidityBuildInput = {
                ...queryOutput,
                slippage: Slippage.fromPercentage('1'), // 1%
                wethIsEth,
            } as RemoveLiquidityNestedCallInputV3;

            const addLiquidityBuildCallOutput = removeLiquidityNested.buildCall(
                removeLiquidityBuildInput,
            );

            // Build call minAmountsOut should be query result with slippage applied
            const expectedMinAmountsOut = queryOutput.amountsOut.map(
                (amountOut) =>
                    removeLiquidityBuildInput.slippage.applyTo(
                        amountOut.amount,
                        -1,
                    ),
            );
            expect(expectedMinAmountsOut).to.deep.eq(
                addLiquidityBuildCallOutput.minAmountsOut.map((a) => a.amount),
            );
            expect(addLiquidityBuildCallOutput.to).to.eq(
                BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            );

            const tokenAmountsForBalanceCheck = [
                ...queryOutput.amountsOut,
                queryOutput.bptAmountIn,
                // add zero address so we can check for native token balance change
                TokenAmount.fromRawAmount(
                    new Token(queryOutput.chainId, zeroAddress, 18),
                    0n,
                ),
            ];

            // send remove liquidity transaction and check balance changes
            const { transactionReceipt, balanceDeltas } =
                await sendTransactionGetBalances(
                    tokenAmountsForBalanceCheck.map((t) => t.token.address),
                    client,
                    testAddress,
                    addLiquidityBuildCallOutput.to,
                    addLiquidityBuildCallOutput.callData,
                );

            expect(transactionReceipt.status).to.eq('success');

            // Should match user bpt amount in and query result for amounts out
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

            expect(expectedDeltas).to.deep.eq(balanceDeltas);
        });
    });
});
