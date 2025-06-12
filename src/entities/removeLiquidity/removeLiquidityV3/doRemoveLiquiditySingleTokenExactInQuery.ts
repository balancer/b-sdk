import { balancerRouterAbiExtended } from '@/abi';
import { ChainId, CHAINS } from '@/utils';
import { createPublicClient, Hex, http } from 'viem';
import { Address } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export const doRemoveLiquiditySingleTokenExactInQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    tokenOut: Address,
    exactBptAmountIn: bigint,
    block?: bigint,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const { result: amountOut } = await client.simulateContract({
        address: AddressProvider.Router(chainId),
        abi: balancerRouterAbiExtended,
        functionName: 'queryRemoveLiquiditySingleTokenExactIn',
        args: [poolAddress, exactBptAmountIn, tokenOut, sender, userData],
        blockNumber: block,
    });
    return amountOut;
};
