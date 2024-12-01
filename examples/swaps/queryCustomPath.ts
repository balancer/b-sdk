/**
 * Example showing how to query custom path, which explicitly chooses the pool(s) to swap through
 *
 * Run with:
 * pnpm example ./examples/swaps/queryCustomPath.ts
 */

import {
    ChainId,
    SwapKind,
    Swap,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapInput,
    Path,
    TokenApi,
} from '../../src';
import { Address } from 'viem';

interface QueryCustomPath {
    rpcUrl: string;
    chainId: ChainId;
    pools: Address[];
    tokenIn: TokenApi;
    tokenOut: TokenApi;
    swapKind: SwapKind;
    protocolVersion: 2 | 3;
    inputAmountRaw: bigint;
    outputAmountRaw: bigint;
}

export const queryCustomPath = async ({
    rpcUrl,
    chainId,
    pools,
    tokenIn,
    tokenOut,
    swapKind,
    protocolVersion,
    inputAmountRaw,
    outputAmountRaw,
}: QueryCustomPath): Promise<{
    swap: Swap;
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput;
}> => {
    // User defines custom paths
    const customPaths: Path[] = [
        {
            pools,
            tokens: [tokenIn, tokenOut],
            protocolVersion,
            inputAmountRaw,
            outputAmountRaw,
        },
    ];

    const swapInput: SwapInput = { chainId, swapKind, paths: customPaths };

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap(swapInput);

    if (swapKind === SwapKind.GivenIn) {
        console.log('Given tokenIn:', {
            address: tokenIn.address,
            amount: inputAmountRaw,
        });
    } else {
        console.log('Given tokenOut:', {
            address: tokenOut.address,
            amount: outputAmountRaw,
        });
    }

    // Get up to date swap result by querying onchain
    const queryOutput = await swap.query(rpcUrl);

    // Construct transaction to make swap
    if (queryOutput.swapKind === SwapKind.GivenIn) {
        console.log('tokenOut:', {
            address: tokenOut.address,
            expectedAmount: queryOutput.expectedAmountOut.amount,
        });
    } else {
        console.log('tokenIn:', {
            address: tokenIn.address,
            expectedAmount: queryOutput.expectedAmountIn.amount,
        });
    }

    return { swap, queryOutput };
};
