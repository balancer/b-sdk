import { createPublicClient, Hex, http } from 'viem';
import { ChainId, CHAINS } from '@/utils';
import { Address } from '@/types';
import { balancerCompositeLiquidityRouterBoostedAbiExtended } from '@/abi';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export const doAddLiquidityProportionalQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    exactBptAmountOut: bigint,
    wrapUnderlying: boolean[],
    block?: bigint,
): Promise<[Address[], bigint[]]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const {
        result: [tokensIn, exactAmountsIn],
    } = await client.simulateContract({
        address: AddressProvider.CompositeLiquidityRouter(chainId),
        abi: balancerCompositeLiquidityRouterBoostedAbiExtended,
        functionName: 'queryAddLiquidityProportionalToERC4626Pool',
        args: [
            poolAddress,
            wrapUnderlying,
            exactBptAmountOut,
            sender,
            userData,
        ],
        blockNumber: block,
    });

    return [[...tokensIn], [...exactAmountsIn]];
};
