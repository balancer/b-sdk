import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionV3Abi,
    vaultV3Abi,
} from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http } from 'viem';
import { RemoveLiquidityProportionalInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquidityProportionalQuery = async (
    { chainId, rpcUrl, bptIn }: RemoveLiquidityProportionalInput,
    poolAddress: Address,
): Promise<readonly bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: amountsOut } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: [
            ...balancerRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionV3Abi,
            ...permit2Abi,
        ],
        functionName: 'queryRemoveLiquidityProportional',
        args: [poolAddress, bptIn.rawAmount, '0x'],
    });
    return amountsOut;
};
