import { createPublicClient, http } from 'viem';
import { ChainId, CHAINS } from '@/utils';
import { BALANCER_BUFFER_ROUTER } from '@/utils/constantsV3';

import { Address } from '@/types';
import {
    balancerBufferRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';

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
        abi: [
            ...balancerBufferRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        functionName: 'queryAddLiquidityToBuffer',
        args: [wrappedToken, exactSharesToIssue],
        blockNumber: block,
    });
    return { amountUnderlyingIn, amountWrappedIn };
};
