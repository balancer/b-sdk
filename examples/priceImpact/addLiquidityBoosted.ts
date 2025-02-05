/**
 * Example showing how to calculate price impact when adding liquidity with unbalanced inputs.
 *
 * Note: this example is highlighting one use case. You'll find other price impact
 * calculations within each example, such as add/remove liquidity nested, etc..
 *
 * Run with:
 * pnpm example ./examples/priceImpact/addLiquidityBoosted.ts
 */
import { config } from 'dotenv';
config();

import { Address, parseUnits } from 'viem';
import {
    AddLiquidityKind,
    BalancerApi,
    ChainId,
    PriceImpact,
    API_ENDPOINT,
    AddLiquidityBoostedUnbalancedInput,
} from 'src';

const addLiquidityPriceImpact = async () => {
    // User defined
    const rpcUrl = process.env.SONIC_RPC_URL as string;
    const chainId = ChainId.SONIC;
    const poolId = '0x43026d483f42fb35efe03c20b251142d022783f2'; // BeefyUSDC.e / scUSD

    const amountsIn = [
        {
            rawAmount: parseUnits('0.1', 6),
            decimals: 6,
            address: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894' as Address, // USDC.e
        },
        {
            rawAmount: parseUnits('0.1', 6),
            decimals: 6,
            address: '0xd3dce716f3ef535c5ff8d041c1a41c3bd89b97ae' as Address, // sUSD
        },
    ];

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
    const poolStateWithUnderlyings =
        await balancerApi.boostedPools.fetchPoolStateWithUnderlyings(poolId);

    // Construct the AddLiquidityInput, in this case an AddLiquidityUnbalanced
    const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
        amountsIn,
        chainId,
        rpcUrl,
        kind: AddLiquidityKind.Unbalanced,
    };

    // Calculate Price Impact
    const priceImpact = await PriceImpact.addLiquidityUnbalancedBoosted(
        addLiquidityInput,
        poolStateWithUnderlyings,
    );
    console.log('\nPool address: ', poolStateWithUnderlyings.address);
    console.log('Amounts in: ', amountsIn);
    console.log(`Price Impact: ${priceImpact.percentage.toFixed(2)}%\n`);
};

export default addLiquidityPriceImpact;
