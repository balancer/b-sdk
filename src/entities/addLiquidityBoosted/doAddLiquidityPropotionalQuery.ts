import { createPublicClient, Hex, http } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, ChainId, CHAINS } from '@/utils';

import { Address } from '@/types';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

export const doAddLiquidityProportionalQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    exactBptAmountOut: bigint,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: exactAmountsIn } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: balancerCompositeLiquidityRouterAbi,
        functionName: 'queryAddLiquidityProportionalToERC4626Pool',
        args: [poolAddress, exactBptAmountOut, sender, userData],
    });
    return [...exactAmountsIn];
};
