import { createPublicClient, http } from 'viem';
import { AddLiquidityProportionalInput } from '../types';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { balancerRouterAbi } from '@/abi';
import { Address } from '@/types';

export const doAddLiquidityProportionalQuery = async (
    { rpcUrl, chainId }: AddLiquidityProportionalInput,
    poolAddress: Address,
    maxAmountsIn: bigint[],
    bptOut: bigint,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: amountsIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryAddLiquidityProportional',
        args: [poolAddress, maxAmountsIn, bptOut, '0x'],
    });

    return amountsIn;
};
