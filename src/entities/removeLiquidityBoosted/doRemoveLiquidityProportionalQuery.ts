import { createPublicClient, Hex, http } from 'viem';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, ChainId, CHAINS } from '@/utils';
import { Address } from '@/types';
import { balancerCompositeLiquidityRouterAbi } from '@/abi';

export const doRemoveLiquidityProportionalQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    exactBptAmountIn: bigint,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: underlyingAmountsOut } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: balancerCompositeLiquidityRouterAbi,
        functionName: 'queryRemoveLiquidityProportionalFromERC4626Pool',
        args: [poolAddress, exactBptAmountIn, sender, userData],
    });
    // underlying amounts (not pool token amounts)
    return [...underlyingAmountsOut];
};
