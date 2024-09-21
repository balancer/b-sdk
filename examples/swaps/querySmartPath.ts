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
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const chainId = ChainId.SEPOLIA;
    const swapKind = SwapKind.GivenOut;
    const tokenIn = new Token(
        chainId,
        '0xE8d4E9Fc8257B77Acb9eb80B5e8176F4f0cBCeBC',
        18,
        'MockToken1',
    );
    const tokenOut = new Token(
        chainId,
        '0xF0Bab79D87F51a249AFe316a580C1cDFC111bE10',
        18,
        'MockToken2',
    );
    const swapAmount =
        swapKind === SwapKind.GivenIn
            ? TokenAmount.fromHumanAmount(tokenIn, '1.2345678910')
            : TokenAmount.fromHumanAmount(tokenOut, '1.2345678910');

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

    console.log(
        `Input token: ${swap.inputAmount.token.address}, Amount: ${swap.inputAmount.amount}`,
    );
    console.log(
        `Output token: ${swap.outputAmount.token.address}, Amount: ${swap.outputAmount.amount}`,
    );

    // Get up to date swap result by querying onchain
    const queryOutput = await swap.query(rpcUrl);

    // Construct transaction to make swap
    if (queryOutput.swapKind === SwapKind.GivenIn) {
        console.log(`Updated amount: ${queryOutput.expectedAmountOut.amount}`);
    } else {
        console.log(`Updated amount: ${queryOutput.expectedAmountIn.amount}`);
    }

    return queryOutput;
};

export default querySmartPath;
