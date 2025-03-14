import { balancerRouterAbiExtended } from '@/abi';
import { BALANCER_ROUTER, ChainId, CHAINS } from '@/utils';
import { createPublicClient, Hex, http } from 'viem';
import { Address } from '@/types';

export const doRemoveLiquidityProportionalQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    exactBptAmountIn: bigint,
    block?: bigint,
): Promise<readonly bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: amountsOut } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbiExtended,
        functionName: 'queryRemoveLiquidityProportional',
        args: [poolAddress, exactBptAmountIn, sender, userData],
        blockNumber: block,
    });
    return amountsOut;
};
