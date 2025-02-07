import { createPublicClient, Hex, http } from 'viem';

import { ChainId, CHAINS } from '@/utils';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED } from '@/utils/constantsV3';

import { Address } from '@/types';

import {
    balancerCompositeLiquidityRouterBoostedAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';

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
        abi: [
            ...balancerCompositeLiquidityRouterBoostedAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
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
