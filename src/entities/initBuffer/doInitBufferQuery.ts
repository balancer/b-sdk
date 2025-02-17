import { createPublicClient, http } from 'viem';
import { BALANCER_BUFFER_ROUTER, ChainId, CHAINS } from '@/utils';
import { Address } from '@/types';
import {
    balancerBufferRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';

export const doInitBufferQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    wrappedToken: Address,
    exactAmountUnderlyingIn: bigint,
    exactAmountWrappedIn: bigint,
): Promise<{ issuedShares: bigint }> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: issuedShares } = await client.simulateContract({
        address: BALANCER_BUFFER_ROUTER[chainId],
        abi: [
            ...balancerBufferRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        functionName: 'queryInitializeBuffer',
        args: [wrappedToken, exactAmountUnderlyingIn, exactAmountWrappedIn],
    });
    return { issuedShares };
};
