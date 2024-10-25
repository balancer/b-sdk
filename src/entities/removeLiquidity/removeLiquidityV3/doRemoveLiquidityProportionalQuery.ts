import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http, zeroAddress } from 'viem';
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
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        functionName: 'queryRemoveLiquidityProportional',
        args: [poolAddress, bptIn.rawAmount, zeroAddress, '0x'],
    });
    return amountsOut;
};
