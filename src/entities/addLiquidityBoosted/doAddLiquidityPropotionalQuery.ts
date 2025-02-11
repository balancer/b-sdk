import { createPublicClient, Hex, http } from 'viem';
import {
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
    ChainId,
    CHAINS,
} from '@/utils';
import { Address } from '@/types';
import {
    balancerCompositeLiquidityRouterBoostedAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';

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
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
        abi: [
            ...balancerCompositeLiquidityRouterBoostedAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
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
