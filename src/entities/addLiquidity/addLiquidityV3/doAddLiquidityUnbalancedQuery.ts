import { createPublicClient, Hex, http } from 'viem';
import { ChainId, CHAINS } from '@/utils';
import { balancerRouterAbiExtended } from '@/abi';
import { Address } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export const doAddLiquidityUnbalancedQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    maxAmountsIn: bigint[],
    block?: bigint,
) => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: bptAmountOut } = await client.simulateContract({
        address: AddressProvider.Router(chainId),
        abi: balancerRouterAbiExtended,
        functionName: 'queryAddLiquidityUnbalanced',
        args: [poolAddress, maxAmountsIn, sender, userData],
        blockNumber: block,
    });
    return bptAmountOut;
};
