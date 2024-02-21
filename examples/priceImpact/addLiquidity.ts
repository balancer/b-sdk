/**
 * Example showing how to calculate price impact when adding liquidity with unbalanced inputs.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/priceImpact/addLiquidity.ts
 */
import { config } from 'dotenv';
config();

import { parseUnits } from 'viem';
import {
    AddLiquidityInput,
    AddLiquidityKind,
    BalancerApi,
    ChainId,
    PriceImpact,
} from 'src';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';

const addLiquidityPriceImpact = async () => {
    // User defined
    const chainId = ChainId.MAINNET;
    const poolId =
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH

    // Start a local anvil fork that will be used to query/tx against
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    const poolState = await balancerApi.pools.fetchPoolState(poolId);

    // We create arbitrary amounts in but these would usually be set by user
    const amountsIn = poolState.tokens.map((t) => ({
        rawAmount: parseUnits('1', t.decimals),
        decimals: t.decimals,
        address: t.address,
    }));

    // Construct the AddLiquidityInput, in this case an AddLiquidityUnbalanced
    const addLiquidityInput: AddLiquidityInput = {
        amountsIn,
        chainId,
        rpcUrl,
        kind: AddLiquidityKind.Unbalanced,
    };

    // Calculate Price Impact
    const priceImpact = await PriceImpact.addLiquidityUnbalanced(
        addLiquidityInput,
        poolState,
    );
    console.log('\nPool address: ', poolState.address);
    console.log('Amounts in: ', amountsIn);
    console.log(`Price Impact: ${priceImpact.percentage.toFixed(2)}%\n`);
};

export default addLiquidityPriceImpact;
