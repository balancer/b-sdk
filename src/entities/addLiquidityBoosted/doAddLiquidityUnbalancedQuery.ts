import { createPublicClient, Hex, http } from 'viem';

import {
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED,
    ChainId,
    CHAINS,
} from '@/utils';

import { Address } from '@/types';
import { balancerCompositeLiquidityRouterBoostedAbiExtended } from '@/abi';

export const doAddLiquidityUnbalancedQuery = async (
    rpcUrl: string,
    chainId: ChainId,
    sender: Address,
    userData: Hex,
    poolAddress: Address,
    wrapUnderlying: boolean[],
    exactUnderlyingAmountsIn: bigint[],
    block?: bigint,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: bptAmountOut } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[chainId],
        abi: balancerCompositeLiquidityRouterBoostedAbiExtended,
        functionName: 'queryAddLiquidityUnbalancedToERC4626Pool',
        args: [
            poolAddress,
            wrapUnderlying,
            exactUnderlyingAmountsIn,
            sender,
            userData,
        ],
        blockNumber: block,
    });
    return bptAmountOut;
};
