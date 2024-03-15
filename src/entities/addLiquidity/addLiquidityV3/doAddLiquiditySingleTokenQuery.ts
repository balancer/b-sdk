import { createPublicClient, http } from 'viem';
import { AddLiquiditySingleTokenInput } from '../types';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { balancerRouterAbi } from '@/abi';
import { Address } from '@/types';

export const doAddLiquiditySingleTokenQuery = async (
    { rpcUrl, chainId, tokenIn }: AddLiquiditySingleTokenInput,
    poolAddress: Address,
    bptOut: bigint,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: amountIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryAddLiquiditySingleTokenExactOut',
        args: [poolAddress, tokenIn, bptOut, '0x'],
    });
    return amountIn;
};
