import { createPublicClient, http, getAddress } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, CHAINS } from '@/utils';

import { Address } from '@/types';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

import { RemoveLiquidityProportionalInput } from 'src';

export const doRemoveLiquidityProportionalQuery = async (
    { rpcUrl, chainId, bptIn }: RemoveLiquidityProportionalInput,
    poolAddress: Address,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: exactAmountsOut } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: balancerCompositeLiquidityRouterAbi,
        functionName: 'queryRemoveLiquidityProportionalFromERC4626Pool',
        args: [
            poolAddress,
            bptIn.rawAmount,
            getAddress('0xa5cc3c03994db5b0d9a5eEdD10Cabab0813678ac'),
            '0x',
        ],
    });
    // underlying amounts (not pool token amounts)
    return [...exactAmountsOut];
};
