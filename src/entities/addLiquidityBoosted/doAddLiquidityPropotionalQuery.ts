import { createPublicClient, http, getAddress } from 'viem';

import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER, CHAINS } from '@/utils';

import { AddLiquidityProportionalInput } from '../addLiquidity/types';
import { Address } from '@/types';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

export const doAddLiquidityProportionalQuery = async (
    { rpcUrl, chainId, referenceAmount }: AddLiquidityProportionalInput,
    poolAddress: Address,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { result: exactAmountsIn } = await client.simulateContract({
        address: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        abi: balancerCompositeLiquidityRouterAbi,
        functionName: 'queryAddLiquidityProportionalToERC4626Pool',
        args: [
            poolAddress,
            referenceAmount.rawAmount,
            getAddress('0xa5cc3c03994db5b0d9a5eEdD10Cabab0813678ac'),
            '0x',
        ],
    });
    return [...exactAmountsIn];
};
