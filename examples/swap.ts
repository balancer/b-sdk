/**
 * Example showing how to find swap information for a token pair.
 *
 * Run with:
 * pnpm example ./examples/swap.ts
 */
import { config } from 'dotenv';
config();

import {
    BalancerApi,
    ChainId,
    Slippage,
    SwapKind,
    Token,
    TokenAmount,
    Swap,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    PriceImpact,
} from '../src';

const swap = async () => {
    // User defined
    const chainId = ChainId.POLYGON;
    const swapKind = SwapKind.GivenIn;
    const tokenIn = new Token(
        chainId,
        '0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6',
        18,
        'MaticX',
    );
    const tokenOut = new Token(
        chainId,
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        18,
        'WMATIC',
    );
    const slippage = Slippage.fromPercentage('0.1');
    const swapAmount =
        swapKind === SwapKind.GivenIn
            ? TokenAmount.fromHumanAmount(tokenIn, '1.2345678910')
            : TokenAmount.fromHumanAmount(tokenOut, '1.2345678910');
    const sender = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const recipient = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const deadline = 999999999999999999n; // Infinity

    // API is used to fetch best path from available liquidity
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );

    const sorPaths = await balancerApi.sorSwapPaths.fetchSorSwapPaths({
        chainId,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        swapKind,
        swapAmount,
    });

    const swapInput = {
        chainId,
        paths: sorPaths,
        swapKind,
    };

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap(swapInput);

    console.log(
        `Input token: ${swap.inputAmount.token.address}, Amount: ${swap.inputAmount.amount}`,
    );
    console.log(
        `Output token: ${swap.outputAmount.token.address}, Amount: ${swap.outputAmount.amount}`,
    );

    // Get price impact
    const priceImpact = await PriceImpact.swap(swapInput);

    console.log(`Price Impact: ${priceImpact.percentage.toFixed(2)}%`);

    // Get up to date swap result by querying onchain
    const updated = await swap.query(process.env.POLYGON_RPC_URL);

    // Construct transaction to make swap
    if (updated.swapKind === SwapKind.GivenIn) {
        console.log(`Updated amount: ${updated.expectedAmountOut.amount}`);
        const callData = swap.buildCall({
            slippage,
            deadline,
            queryOutput: updated,
            sender,
            recipient,
            wethIsEth: false,
        }) as SwapBuildOutputExactIn;
        console.log(
            `Min Amount Out: ${callData.minAmountOut.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    } else {
        console.log(`Updated amount: ${updated.expectedAmountIn.amount}`);
        const callData = swap.buildCall({
            slippage,
            deadline,
            queryOutput: updated,
            sender,
            recipient,
            wethIsEth: false,
        }) as SwapBuildOutputExactOut;
        console.log(
            `Max Amount In: ${callData.maxAmountIn.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    }
};

export default swap;
