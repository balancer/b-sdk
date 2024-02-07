/**
 * Example showing how to find swap information for a token pair.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/swap.ts
 */
import { config } from 'dotenv';
config();

import { BalancerApi, ChainId, Slippage, SwapKind } from '../src';
// TODO - Move these to src import once old SOR removed
import { Swap } from '@/entities/swap';

const addLiquidity = async () => {
    // User defined
    const chainId = ChainId.MAINNET;

    // API is used to fetch best path from available liquidity
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    // TODO - Add input params
    const sorPaths = await balancerApi.sorGetQuote.fetchSorGetQuote();

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap({
        chainId,
        paths: sorPaths,
        swapKind: SwapKind.GivenIn,
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
