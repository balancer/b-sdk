import { createPublicClient, http } from 'viem';
import { ChainId, CHAINS } from '@/utils';
import { Address, Hex } from '@/types';
import { balancerUnbalancedAddViaSwapRouterAbiExtended } from '@/abi';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export const doAddLiquidityUnbalancedViaSwapQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    pool: Address,
    sender: Address,
    exactBptAmountOut: bigint,
    exactToken: Address,
    exactAmount: bigint,
    maxAdjustableAmount: bigint,
    addLiquidityUserData: Hex,
    swapUserData: Hex,
    block?: bigint,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: amountsIn } = await client.simulateContract({
        address: AddressProvider.UnbalancedAddViaSwapRouter(chainId),
        abi: balancerUnbalancedAddViaSwapRouterAbiExtended,
        functionName: 'queryAddLiquidityUnbalanced',
        args: [
            pool,
            sender,
            {
                exactBptAmountOut,
                exactToken,
                exactAmount,
                maxAdjustableAmount,
                addLiquidityUserData,
                swapUserData,
            },
        ],
        blockNumber: block,
    });

    return [...amountsIn];
};
