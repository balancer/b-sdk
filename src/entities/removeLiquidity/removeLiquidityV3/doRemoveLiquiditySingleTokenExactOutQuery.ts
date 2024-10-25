import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http, zeroAddress } from 'viem';
import { RemoveLiquiditySingleTokenExactOutInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquiditySingleTokenExactOutQuery = async (
    { chainId, rpcUrl, amountOut }: RemoveLiquiditySingleTokenExactOutInput,
    poolAddress: Address,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: bptIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: [
            ...balancerRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        functionName: 'queryRemoveLiquiditySingleTokenExactOut',
        args: [
            poolAddress,
            amountOut.address,
            amountOut.rawAmount,
            zeroAddress,
            '0x',
        ],
    });
    return bptIn;
};
