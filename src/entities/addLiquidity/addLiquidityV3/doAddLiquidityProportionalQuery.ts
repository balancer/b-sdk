import { createPublicClient, Hex, http } from 'viem';
import { balancerV3Contracts, ChainId, CHAINS } from '@/utils';
import { balancerRouterAbiExtended } from '@/abi';
import { Address } from '@/types';

export const doAddLiquidityProportionalQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    bptOut: bigint,
    block?: bigint,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: amountsIn } = await client.simulateContract({
        address: balancerV3Contracts.Router[chainId],
        abi: balancerRouterAbiExtended,
        functionName: 'queryAddLiquidityProportional',
        args: [poolAddress, bptOut, sender, userData],
        blockNumber: block,
    });

    return [...amountsIn];
};
