import { createPublicClient, http } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, CHAINS } from '@/utils';

import { AddLiquidityProportionalInputWithUserArgs } from '../addLiquidity/types';
import { Address } from '@/types';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

export const doAddLiquidityProportionalQuery = async (
    {
        rpcUrl,
        chainId,
        referenceAmount,
        userAddress,
        userData,
    }: AddLiquidityProportionalInputWithUserArgs,
    poolAddress: Address,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: exactAmountsIn } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: balancerCompositeLiquidityRouterAbi,
        functionName: 'queryAddLiquidityProportionalToERC4626Pool',
        args: [poolAddress, referenceAmount.rawAmount, userAddress, userData],
    });
    return [...exactAmountsIn];
};
