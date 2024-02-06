import { balancerRouterAbi } from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http } from 'viem';
import { RemoveLiquidityProportionalInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquidityProportionalQuery = async (
    { chainId, rpcUrl, bptIn }: RemoveLiquidityProportionalInput,
    poolAddress: Address,
    minAmountsOut: bigint[],
): Promise<readonly bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: amountsOut } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryRemoveLiquidityProportional',
        args: [poolAddress, bptIn.rawAmount, minAmountsOut, '0x'],
    });
    return amountsOut;
};
