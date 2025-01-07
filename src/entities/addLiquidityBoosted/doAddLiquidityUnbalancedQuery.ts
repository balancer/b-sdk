import { createPublicClient, Hex, http } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, ChainId, CHAINS } from '@/utils';

import { Address } from '@/types';

import {
    balancerCompositeLiquidityRouterAbi,
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
    exactUnderlyingAmountsIn: bigint[],
    block?: bigint,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: bptAmountOut } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: [
            ...balancerCompositeLiquidityRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        functionName: 'queryAddLiquidityUnbalancedToERC4626Pool',
        args: [poolAddress, exactUnderlyingAmountsIn, sender, userData],
        blockNumber: block,
    });
    return bptAmountOut;
};
