import { createPublicClient, http } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, CHAINS } from '@/utils';

import { Address } from '@/types';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

import { RemoveLiquidityProportionalInputWithUserArgs } from 'src';

export const doRemoveLiquidityProportionalQuery = async (
    {
        rpcUrl,
        chainId,
        bptIn,
        userAddress,
        userData,
    }: RemoveLiquidityProportionalInputWithUserArgs,
    poolAddress: Address,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: exactAmountsOut } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: balancerCompositeLiquidityRouterAbi,
        functionName: 'queryRemoveLiquidityProportionalFromERC4626Pool',
        args: [poolAddress, bptIn.rawAmount, userAddress, userData],
    });
    // underlying amounts (not pool token amounts)
    return [...exactAmountsOut];
};
