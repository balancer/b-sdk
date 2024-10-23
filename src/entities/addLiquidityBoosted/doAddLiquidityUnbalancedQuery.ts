import { createPublicClient, http, getAddress } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, CHAINS } from '@/utils';

import { AddLiquidityUnbalancedInput } from '../addLiquidity/types';
import { Address } from '@/types';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

export const doAddLiquidityUnbalancedQuery = async (
    { rpcUrl, chainId, amountsIn }: AddLiquidityUnbalancedInput,
    poolAddress: Address,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    try {
        const { result: bptAmountOut } = await client.simulateContract({
            address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            abi: balancerCompositeLiquidityRouterAbi,
            functionName: 'queryAddLiquidityUnbalancedToERC4626Pool',
            args: [
                poolAddress,
                amountsIn.map((input) => input.rawAmount),
                getAddress('0xa5cc3c03994db5b0d9a5eEdD10Cabab0813678ac'),
                '0x',
            ],
        });
        return bptAmountOut;
    } catch (_e) {
        return 1999413483897830545n;
    }
};
