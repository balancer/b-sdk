/**
 * Example showing how to remove liquidity from a V3 nested pool.
 * V3 nested removes are always proportional.
 * User must approve composite router to spend BPT token - See tests in test/v3/removeLiquidityNested for full flow.
 * (Runs against a local Anvil fork)
 * Note - remove transaction is not fully run in this example because we cannot use slot method to artificially give test account BPT balance.
 *
 * Run with:
 * pnpm example ./examples/removeLiquidity/removeLiquidityNested.V3.ts
 */
import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    Address,
    BalancerApi,
    TEST_API_ENDPOINT,
    ChainId,
    CHAINS,
    Slippage,
    RemoveLiquidityNested,
} from '../../src';
import {
    ANVIL_NETWORKS,
    NetworkSetup,
    startFork,
} from '../../test/anvil/anvil-global-setup';

const removeLiquidityNestedV3 = async () => {
    // User defined inputs
    const chainId = ChainId.SEPOLIA;
    const pool = {
        id: '0x0270daf4ee12ccb1abc8aa365054eecb1b7f4f6b',
        address: '0x0270daf4ee12ccb1abc8aa365054eecb1b7f4f6b' as Address,
    }; // WETH/BOOSTED-USD Pool
    const bptAmountIn = parseUnits('1', 18);
    const slippage = Slippage.fromPercentage('1'); // 1%

    // This sets up a local fork with a test client/account
    const { rpcUrl } = await setup(chainId, ANVIL_NETWORKS.SEPOLIA);

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(TEST_API_ENDPOINT, chainId);
    const nestedPoolState = await balancerApi.nestedPools.fetchNestedPoolState(
        pool.id,
    );
    // setup remove liquidity helper
    const removeLiquidityNested = new RemoveLiquidityNested();

    const removeLiquidityInput = {
        bptAmountIn,
        chainId,
        rpcUrl,
    };

    // TODO add this back once PI supports V3
    // Calculate price impact to ensure it's acceptable
    // const priceImpact = await PriceImpact.removeLiquidityNested(
    //     removeLiquidityInput,
    //     nestedPoolState,
    // );
    // console.log(`\nPrice Impact: ${priceImpact.percentage.toFixed(2)}%`);

    // Query the current onchain result of the operation
    // In V3 removeLiquidityNested is always proportional
    const queryOutput = await removeLiquidityNested.query(
        removeLiquidityInput,
        nestedPoolState,
    );

    console.log('\nRemove Liquidity Query Output:');
    console.table({
        tokensOut: queryOutput.amountsOut.map((a) => a.token.address),
        amountsOut: queryOutput.amountsOut.map((a) => a.amount),
    });
    console.log(`BPT In: ${queryOutput.bptAmountIn.amount.toString()}`);

    // Build the transaction data with slippage applied
    const call = removeLiquidityNested.buildCall(
        removeLiquidityNested.buildRemoveLiquidityInput(queryOutput, {
            slippage,
        }),
    );

    console.log('\nWith slippage applied:');
    console.table({
        tokensOut: call.minAmountsOut.map((a) => a.token.address),
        minAmountsOut: call.minAmountsOut.map((a) => a.amount),
    });
};

async function setup(chainId: ChainId, network: NetworkSetup) {
    const { rpcUrl } = await startFork(network);

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    return {
        client,
        rpcUrl,
    };
}

export default removeLiquidityNestedV3;
