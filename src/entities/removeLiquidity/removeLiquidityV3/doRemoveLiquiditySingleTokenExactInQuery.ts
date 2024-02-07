import { balancerRouterAbi } from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http } from 'viem';
import { RemoveLiquiditySingleTokenExactInInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquiditySingleTokenExactInQuery = async (
    {
        chainId,
        rpcUrl,
        bptIn,
        tokenOut,
    }: RemoveLiquiditySingleTokenExactInInput,
    poolAddress: Address,
    minAmountOut: bigint,
): Promise<readonly bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: amountsOut } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryRemoveLiquiditySingleTokenExactIn',
        args: [poolAddress, bptIn.rawAmount, tokenOut, minAmountOut, '0x'],
    });
    return amountsOut;
};
