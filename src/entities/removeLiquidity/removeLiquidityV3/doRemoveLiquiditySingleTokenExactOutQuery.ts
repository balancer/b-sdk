import { balancerRouterAbi } from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http } from 'viem';
import { RemoveLiquiditySingleTokenExactOutInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquiditySingleTokenExactOutQuery = async (
    { chainId, rpcUrl, amountOut }: RemoveLiquiditySingleTokenExactOutInput,
    poolAddress: Address,
    maxBptAmountIn: bigint,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: bptIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryRemoveLiquiditySingleTokenExactOut',
        args: [
            poolAddress,
            maxBptAmountIn,
            amountOut.address,
            amountOut.rawAmount,
            '0x',
        ],
    });
    return bptIn;
};
