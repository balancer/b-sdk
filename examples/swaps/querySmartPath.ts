/**
 * Example showing how to query swap using the Smart Order Router (SOR)
 *
 * Run with:
 * pnpm example ./examples/swaps/querySmartPath.ts
 */

import {
    BalancerApi,
    API_ENDPOINT,
    ChainId,
    SwapKind,
    Token,
    TokenAmount,
    Swap,
    ExactInQueryOutput,
    ExactOutQueryOutput,
} from '../../src';

interface QuerySmartPath {
    rpcUrl: string;
    chainId: ChainId;
    swapKind: SwapKind;
    tokenIn: Token;
    tokenOut: Token;
    swapAmount: TokenAmount;
}

export const querySmartPath = async ({
    rpcUrl,
    chainId,
    swapKind,
    tokenIn,
    tokenOut,
    swapAmount,
}: QuerySmartPath): Promise<{
    swap: Swap;
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput;
}> => {
    // API is used to fetch best path from available liquidity
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);

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

    console.table({
        Address: {
            tokenIn: swap.inputAmount.token.address,
            tokenOut: swap.outputAmount.token.address,
        },
        Amount: {
            tokenIn: swap.inputAmount.amount,
            tokenOut: swap.outputAmount.amount,
        },
    });

    // Get up to date swap result by querying onchain
    const queryOutput = await swap.query(rpcUrl);

    // Construct transaction to make swap
    if (queryOutput.swapKind === SwapKind.GivenIn) {
        console.log(
            'Expected Amount Out:',
            queryOutput.expectedAmountOut.amount,
        );
    } else {
        console.log('Expected Amount In:', queryOutput.expectedAmountIn.amount);
    }

    return { swap, queryOutput };
};
