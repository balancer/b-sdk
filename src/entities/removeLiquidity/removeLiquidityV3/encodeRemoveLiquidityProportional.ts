import { encodeFunctionData } from 'viem';
import { RemoveLiquidityBaseCall } from '../types';
import { balancerRouterAbi } from '@/abi';

export const encodeRemoveLiquidityProportional = (
    input: RemoveLiquidityBaseCall,
    minAmountsOut: bigint[],
) => {
    return encodeFunctionData({
        abi: balancerRouterAbi,
        functionName: 'removeLiquidityProportional',
        args: [
            input.poolId,
            input.bptIn.amount,
            minAmountsOut,
            input.wethIsEth,
            '0x',
        ],
    });
};
