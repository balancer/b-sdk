import { createPublicClient, http } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, CHAINS } from '@/utils';

import { AddLiquidityUnbalancedInputWithUserArgs } from '../addLiquidity/types';
import { Address } from '@/types';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

export const doAddLiquidityUnbalancedQuery = async (
    {
        rpcUrl,
        chainId,
        amountsIn,
        userAddress,
        userData,
    }: AddLiquidityUnbalancedInputWithUserArgs,
    poolAddress: Address,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: bptAmountOut } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: balancerCompositeLiquidityRouterAbi,
        functionName: 'queryAddLiquidityUnbalancedToERC4626Pool',
        args: [
            poolAddress,
            amountsIn.map((input) => input.rawAmount),
            userAddress,
            userData,
        ],
    });
    return bptAmountOut;
};
