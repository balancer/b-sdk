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
} from '../src';

const swap = async () => {
    // User defined
    const chainId = ChainId.MAINNET;
    const swapKind = SwapKind.GivenOut;
    const tokenIn = new Token(
        chainId,
        '0xba100000625a3754423978a60c9317c58a424e3D',
        18,
        'BAL',
    );
    const tokenOut = new Token(
        chainId,
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        18,
        'ETH',
    );
    const slippage = Slippage.fromPercentage('0.1');
    const swapAmount =
        swapKind === SwapKind.GivenOut
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

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap({
        chainId,
        paths: sorPaths,
        swapKind,
    });

    console.log(
        `Input token: ${swap.inputAmount.token.address}, Amount: ${swap.inputAmount.amount}`,
    );
    console.log(
        `Output token: ${swap.outputAmount.token.address}, Amount: ${swap.outputAmount.amount}`,
    );

    // Get up to date swap result by querying onchain
    const updated = await swap.query(process.env.ETHEREUM_RPC_URL);
    console.log(`Updated amount: ${updated.amount}`);

    // Construct transaction to make swap
    if (swapKind === SwapKind.GivenIn) {
        const callData = swap.buildCall({
            slippage,
            deadline,
            expectedAmountOut: updated,
            sender,
            recipient,
            wethIsEth: false,
        }) as SwapBuildOutputExactIn;
        console.log(
            `Min Amount Out: ${callData.minAmountOut.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    } else {
        const callData = swap.buildCall({
            slippage,
            deadline,
            expectedAmountIn: updated,
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
