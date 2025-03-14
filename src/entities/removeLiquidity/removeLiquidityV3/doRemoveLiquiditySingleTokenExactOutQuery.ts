import { balancerRouterAbiExtended } from '@/abi';
import { BALANCER_ROUTER, ChainId, CHAINS } from '@/utils';
import { createPublicClient, Hex, http } from 'viem';
import { Address } from '@/types';

export const doRemoveLiquiditySingleTokenExactOutQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    tokenOut: Address,
    exactAmountOut: bigint,
    block?: bigint,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: bptIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbiExtended,
        functionName: 'queryRemoveLiquiditySingleTokenExactOut',
        args: [poolAddress, tokenOut, exactAmountOut, sender, userData],
        blockNumber: block,
    });
    return bptIn;
};
