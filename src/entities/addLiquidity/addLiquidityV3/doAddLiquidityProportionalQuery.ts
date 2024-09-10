import { createPublicClient, http } from 'viem';
import { AddLiquidityProportionalInput } from '../types';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionV3Abi,
    vaultV3Abi,
} from '@/abi';
import { Address } from '@/types';

export const doAddLiquidityProportionalQuery = async (
    { rpcUrl, chainId }: AddLiquidityProportionalInput,
    poolAddress: Address,
    bptOut: bigint,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: amountsIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: [
            ...balancerRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionV3Abi,
            ...permit2Abi,
        ],
        functionName: 'queryAddLiquidityProportional',
        args: [poolAddress, bptOut, '0x'],
    });

    return [...amountsIn];
};
