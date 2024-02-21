/**
 * Example showing how to calculate price impact when removing liquidity with unbalanced outputs.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/priceImpact/removeLiquidity.ts
 */
import { config } from 'dotenv';
config();

import { parseEther } from 'viem';
import {
    BalancerApi,
    ChainId,
    InputAmount,
    PoolState,
    PriceImpact,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from 'src';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';

const removeLiquidityPriceImpact = async () => {
    // User defined:
    const chainId = ChainId.MAINNET;
    const poolId =
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
    const tokenOut = '0xba100000625a3754423978a60c9317c58a424e3D'; // BAL

    // Start a local anvil fork that will be used to query/tx against
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    const poolState: PoolState = await balancerApi.pools.fetchPoolState(poolId);

    // Construct the RemoveLiquidityInput, in this case a RemoveLiquiditySingleTokenExactIn
    const bptIn: InputAmount = {
        rawAmount: parseEther('1'),
        decimals: 18,
        address: poolState.address,
    };
    const removeLiquidityInput: RemoveLiquidityInput = {
        chainId,
        rpcUrl,
        bptIn,
        tokenOut,
        kind: RemoveLiquidityKind.SingleTokenExactIn,
    };

    const priceImpact = await PriceImpact.removeLiquidity(
        removeLiquidityInput,
        poolState,
    );
    console.log('\nPool address: ', poolState.address);
    console.log('Amount in: ', bptIn);
    console.log('Token out: ', tokenOut);
    console.log(`Price Impact: ${priceImpact.percentage.toFixed(2)}%\n`);
};

export default removeLiquidityPriceImpact;
