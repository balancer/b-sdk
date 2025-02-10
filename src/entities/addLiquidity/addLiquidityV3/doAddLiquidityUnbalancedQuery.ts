import { createPublicClient, Hex, http } from 'viem';
import { ChainId, CHAINS } from '@/utils';
import { BALANCER_ROUTER } from '@/utils/constantsV3';

import {
    balancerRouterAbi,
    permit2Abi,
    vaultExtensionAbi_V3,
    vaultV3Abi,
} from '@/abi';
import { Address } from '@/types';

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
        address: BALANCER_ROUTER[chainId],
        abi: [
            ...balancerRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        functionName: 'queryAddLiquidityUnbalanced',
        args: [poolAddress, maxAmountsIn, sender, userData],
        blockNumber: block,
    });
    return bptAmountOut;
};
