/**
 * Example showing how to query swap using paths from the SOR
 *
 * Run with:
 * pnpm example ./examples/swaps/querySmartPath.ts
 */
import { config } from 'dotenv';
config();

import {
    BalancerApi,
    API_ENDPOINT,
    ChainId,
    SwapKind,
    Token,
    TokenAmount,
    Swap,
} from '../../src';

const querySmartPath = async () => {
    // User defined
    const rpcUrl = process.env.MAINNET_RPC_URL;
    const chainId = ChainId.MAINNET;
    const swapKind = SwapKind.GivenIn as SwapKind;
    const tokenIn = new Token(
        chainId,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        6,
        'USDC',
    );
    const tokenOut = new Token(
        chainId,
        '0xba100000625a3754423978a60c9317c58a424e3D',
        18,
        'BAL',
    );
    const swapAmount =
        swapKind === SwapKind.GivenIn
            ? TokenAmount.fromHumanAmount(tokenIn, '100')
            : TokenAmount.fromHumanAmount(tokenOut, '100');

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

    return { swap, chainId, queryOutput };
};

export default querySmartPath;
