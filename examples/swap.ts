/**
 * Example showing how to find swap information for a token pair.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/swap.ts
 */
import { config } from 'dotenv';
config();

import {
    BalancerApi,
    ChainId,
    GetQuoteInput,
    Slippage,
    SwapKind,
    Token,
    TokenAmount,
    Swap,
} from '../src';

const addLiquidity = async () => {
    // User defined
    const chainId = ChainId.MAINNET;
    const swapKind = SwapKind.GivenIn;

    // API is used to fetch best path from available liquidity
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );

    const tokenIn = new Token(
        chainId,
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        6,
    );

    const swapAmount = TokenAmount.fromHumanAmount(tokenIn, '1');

    const quoteInput: GetQuoteInput = {
        chainId,
        tokenIn: tokenIn.address,
        tokenOut: '0xe07f9d810a48ab5c3c914ba3ca53af14e4491e8a',
        swapKind,
        swapAmount,
        queryBatchSwap: false,
    };
    const sorPaths = await balancerApi.sorGetQuote.fetchSorGetQuote(quoteInput);

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
    console.log(`Price Impact: ${swap.priceImpact.percentage}%`);

    // Get up to date swap result by querying onchain
    const updated = await swap.query(process.env.ETHEREUM_RPC_URL);
    console.log(updated.amount);

    // Construct transaction to make swap
    const slippage = Slippage.fromPercentage('0.1');
    const limits = swap.limits(slippage, updated);
    console.log('Limits:', limits);
    const transactionData = swap.transactionData(
        limits,
        999999999999999999n, // Infinity
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        '0x76fd639005b09140a8616f036B64DaCefe93617B',
    );
    console.log(
        `Tx:\nTo: ${transactionData.to}\nCallData: ${transactionData.data}\nValue: ${transactionData.value}`,
    );
};

export default addLiquidity;
