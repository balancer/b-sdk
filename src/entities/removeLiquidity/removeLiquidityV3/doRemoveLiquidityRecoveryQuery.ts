import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http } from 'viem';
import { RemoveLiquidityRecoveryInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquidityRecoveryQuery = async (
    { chainId, rpcUrl, bptIn, block }: RemoveLiquidityRecoveryInput,
    poolAddress: Address,
): Promise<readonly bigint[]> => {
    // remove liquidity recovery requires bptAmountsIn and returns amountsOut
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
        functionName: 'queryRemoveLiquidityRecovery',
        args: [poolAddress, bptIn.rawAmount],
        blockNumber: block,
    });
    return amountsOut;
};
