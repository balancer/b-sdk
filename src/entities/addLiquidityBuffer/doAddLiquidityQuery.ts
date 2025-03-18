import { createPublicClient, http } from 'viem';
import { BALANCER_BUFFER_ROUTER, ChainId, CHAINS } from '@/utils';
import { Address } from '@/types';
import { balancerBufferRouterAbiExtended } from '@/abi';

export const doAddLiquidityQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    wrappedToken: Address,
    exactSharesToIssue: bigint,
    block?: bigint,
): Promise<{ amountUnderlyingIn: bigint; amountWrappedIn: bigint }> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const {
        result: [amountUnderlyingIn, amountWrappedIn],
    } = await client.simulateContract({
        address: BALANCER_BUFFER_ROUTER[chainId],
        abi: balancerBufferRouterAbiExtended,
        functionName: 'queryAddLiquidityToBuffer',
        args: [wrappedToken, exactSharesToIssue],
        blockNumber: block,
    });
    return { amountUnderlyingIn, amountWrappedIn };
};
