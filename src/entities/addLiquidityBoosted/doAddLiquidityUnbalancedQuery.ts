import { createPublicClient, Hex, http } from 'viem';

import { balancerV3Contracts, ChainId, CHAINS } from '@/utils';

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
        address: balancerV3Contracts.CompositeLiquidityRouter[chainId],
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
