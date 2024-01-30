import { createPublicClient, http } from 'viem';
import { AddLiquidityUnbalancedInput } from '../types';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { balancerRouterAbi } from '@/abi';
import { Address } from '@/types';

export const doAddLiquidityUnbalancedQuery = async (
    { rpcUrl, chainId }: AddLiquidityUnbalancedInput,
    poolAddress: Address,
    maxAmountsIn: bigint[],
) => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: bptAmountOut } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryAddLiquidityUnbalanced',
        args: [
            poolAddress,
            maxAmountsIn,
            0n, // minBptOut set to 0 when querying
            '0x',
        ],
    });
    return bptAmountOut;
};
