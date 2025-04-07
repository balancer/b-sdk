import { createPublicClient, Hex, http } from 'viem';
import { balancerV3Contracts, ChainId, CHAINS } from '@/utils';
import { Address } from '@/types';
import { balancerCompositeLiquidityRouterBoostedAbiExtended } from '@/abi';

export const doRemoveLiquidityProportionalQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    exactBptAmountIn: bigint,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    unwrapWrapped: boolean[],
    block?: bigint,
): Promise<[Address[], bigint[]]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const {
        result: [tokensOut, underlyingAmountsOut],
    } = await client.simulateContract({
        address: balancerV3Contracts.CompositeLiquidityRouter[chainId],
        abi: balancerCompositeLiquidityRouterBoostedAbiExtended,
        functionName: 'queryRemoveLiquidityProportionalFromERC4626Pool',
        args: [poolAddress, unwrapWrapped, exactBptAmountIn, sender, userData],
        blockNumber: block,
    });
    // underlying amounts (not pool token amounts)
    return [[...tokensOut], [...underlyingAmountsOut]];
};
