// pnpm test -- removeLiquidityNestedV3.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
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

    test('remove liquidity transaction, direct approval on router', async () => {
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
        const expectedMinAmountsOut = queryOutput.amountsOut.map((amountOut) =>
            removeLiquidityBuildInput.slippage.applyTo(amountOut.amount, -1),
        );
        expect(expectedMinAmountsOut).to.deep.eq(
            addLiquidityBuildCallOutput.minAmountsOut.map((a) => a.amount),
        );
        expect(addLiquidityBuildCallOutput.to).to.eq(
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );

        // send remove liquidity transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [
                    queryOutput.bptAmountIn.token.address,
                    ...mainTokens.map((t) => t.address),
                ],
                client,
                testAddress,
                addLiquidityBuildCallOutput.to,
                addLiquidityBuildCallOutput.callData,
            );
        expect(transactionReceipt.status).to.eq('success');
        // Should match user bpt amount in and query result for amounts out
        const expectedDeltas = [
            removeLiquidityInput.bptAmountIn,
            ...queryOutput.amountsOut.map((amountOut) => amountOut.amount),
        ];
        queryOutput.amountsOut.map(
            (amountOut) => expect(amountOut.amount > 0n).to.be.true,
        );
        expect(expectedDeltas).to.deep.eq(balanceDeltas);
    });
});
