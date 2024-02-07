import { createPublicClient, http } from 'viem';
import { AddLiquiditySingleTokenInput } from '../types';
import { BALANCER_ROUTER, CHAINS, MAX_UINT112 } from '@/utils';
import { balancerRouterAbi } from '@/abi';
import { Address } from '@/types';

export const doAddLiquiditySingleTokenQuery = async (
    { rpcUrl, chainId, tokenIn }: AddLiquiditySingleTokenInput,
    poolAddress: Address,
    bptOut: bigint,
) => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: maxAmountsIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryAddLiquiditySingleTokenExactOut',
        args: [
            poolAddress,
            tokenIn,
            MAX_UINT112, // maxAmountIn set to max value when querying
            bptOut,
            '0x',
        ],
    });
    return maxAmountsIn;
};
