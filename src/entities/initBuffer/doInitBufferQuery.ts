import { createPublicClient, http } from 'viem';
import { balancerV3Contracts, ChainId, CHAINS } from '@/utils';
import { Address } from '@/types';
import { balancerBufferRouterAbiExtended } from '@/abi';

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
        address: balancerV3Contracts.BufferRouter[chainId],
        abi: balancerBufferRouterAbiExtended,
        functionName: 'queryInitializeBuffer',
        args: [wrappedToken, exactAmountUnderlyingIn, exactAmountWrappedIn],
    });
    return { issuedShares };
};
