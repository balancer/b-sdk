/**
 * Example showing how to calculate price impact when removing nested liquidity with unbalanced outputs.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/priceImpact/removeLiquidityNested.ts
 */
import { config } from 'dotenv';
config();

import { parseUnits } from 'viem';
import {
    Address,
    BalancerApi,
    ChainId,
    getPoolAddress,
    PriceImpact,
    RemoveLiquidityNestedSingleTokenInput,
    ZERO_ADDRESS,
} from 'src';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';

const removeLiquidityNestedPriceImpact = async () => {
    // User defined
    const chainId = ChainId.MAINNET;
    const poolId =
        '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0'; // WETH-3POOL

    // Start a local anvil fork that will be used to query/tx against
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    const nestedPoolState =
        await balancerApi.nestedPools.fetchNestedPoolState(poolId);

    // We create arbitrary amounts in but these would usually be set by user
    const bptIn = parseUnits('1000', 18);

    const removeLiquidityInput: RemoveLiquidityNestedSingleTokenInput = {
        bptAmountIn: bptIn,
        chainId,
        rpcUrl,
        tokenOut: '0x6b175474e89094c44da98b954eedeac495271d0f' as Address, // DAI
        accountAddress: ZERO_ADDRESS, // To be removed so there's no need to provide accountAddress when querying or calculating price impact
    };

    const priceImpact = await PriceImpact.removeLiquidityNested(
        removeLiquidityInput,
        nestedPoolState,
    );

    console.log('\nPool address: ', getPoolAddress(poolId));
    console.log('Amount in: ', bptIn);
    console.log(`Price Impact: ${priceImpact.percentage.toFixed(2)}%\n`);
};

export default removeLiquidityNestedPriceImpact;
