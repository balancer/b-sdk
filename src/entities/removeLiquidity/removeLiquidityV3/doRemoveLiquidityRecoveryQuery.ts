import { balancerRouterAbi, vaultExtensionV3Abi, vaultV3Abi } from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http } from 'viem';
import { RemoveLiquidityRecoveryInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquidityRecoveryQuery = async (
    { chainId, rpcUrl, bptIn }: RemoveLiquidityRecoveryInput,
    poolAddress: Address,
): Promise<readonly bigint[]> => {
    // remove liquidity recovery requires bptAmountsIn and returns amountsOut
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: amountsOut } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: [...balancerRouterAbi, ...vaultV3Abi, ...vaultExtensionV3Abi],
        functionName: 'queryRemoveLiquidityRecovery',
        args: [poolAddress, bptIn.rawAmount],
    });
    return amountsOut;
};
