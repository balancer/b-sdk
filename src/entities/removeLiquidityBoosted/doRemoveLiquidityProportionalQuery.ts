import { createPublicClient, Hex, http } from 'viem';
import {
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
    ChainId,
    CHAINS,
} from '@/utils';
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
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
        abi: balancerCompositeLiquidityRouterBoostedAbiExtended,
        functionName: 'queryRemoveLiquidityProportionalFromERC4626Pool',
        args: [poolAddress, unwrapWrapped, exactBptAmountIn, sender, userData],
        blockNumber: block,
    });
    // underlying amounts (not pool token amounts)
    return [[...tokensOut], [...underlyingAmountsOut]];
};
