import { createPublicClient, http, zeroAddress } from 'viem';
import { AddLiquiditySingleTokenInput } from '../types';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';
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
        abi: [
            ...balancerRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        functionName: 'queryAddLiquiditySingleTokenExactOut',
        args: [poolAddress, tokenIn, bptOut, zeroAddress, '0x'],
    });
    return amountIn;
};
