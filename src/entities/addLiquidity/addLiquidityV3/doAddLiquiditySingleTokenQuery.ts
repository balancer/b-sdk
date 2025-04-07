import { createPublicClient, Hex, http } from 'viem';
import { BALANCER_ROUTER, ChainId, CHAINS } from '@/utils';
import { balancerRouterAbiExtended } from '@/abi';
import { Address } from '@/types';

export const doAddLiquiditySingleTokenQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    tokenIn: Address,
    poolAddress: Address,
    bptOut: bigint,
    block?: bigint,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: amountIn } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbiExtended,
        functionName: 'queryAddLiquiditySingleTokenExactOut',
        args: [poolAddress, tokenIn, bptOut, sender, userData],
        blockNumber: block,
    });
    return amountIn;
};
