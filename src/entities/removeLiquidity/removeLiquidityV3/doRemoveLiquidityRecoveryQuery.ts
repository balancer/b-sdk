import { balancerRouterAbiExtended } from '@/abi';
import { balancerV3Contracts, CHAINS } from '@/utils';
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
        address: balancerV3Contracts.Router[chainId],
        abi: balancerRouterAbiExtended,
        functionName: 'queryRemoveLiquidityRecovery',
        args: [poolAddress, bptIn.rawAmount],
        blockNumber: block,
    });
    return amountsOut;
};
