/**
 * Example showing how to calculate price impact when adding liquidity with unbalanced inputs.
 *
 * Note: this example is highlighting one use case. You'll find other price impact
 * calculations within each example, such as add/remove liquidity nested, etc..
 *
 * Run with:
 * pnpm example ./examples/priceImpact/addLiquidity.ts
 */
import { config } from 'dotenv';
config();

import { Address, parseEther } from 'viem';
import {
    AddLiquidityInput,
    AddLiquidityKind,
    BalancerApi,
    ChainId,
    PriceImpact,
    API_ENDPOINT,
} from 'src';

const addLiquidityPriceImpact = async () => {
    // User defined
    const rpcUrl = process.env.ETHEREUM_RPC_URL as string;
    const chainId = ChainId.MAINNET;
    const poolId =
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
    const amountsIn = [
        {
            rawAmount: parseEther('1'),
            decimals: 18,
            address: '0xba100000625a3754423978a60c9317c58a424e3D' as Address,
        },
        {
            rawAmount: parseEther('1'),
            decimals: 18,
            address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
        },
    ];

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
    const poolState = await balancerApi.pools.fetchPoolState(poolId);

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
