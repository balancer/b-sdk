import { encodeFunctionData, Hex } from 'viem';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { balancerRouterAbi } from '@/abi';

export const encodeRemoveLiquidityProportional = (
    input: RemoveLiquidityBaseBuildCallInput & { userData: Hex },
    minAmountsOut: bigint[],
) => {
    return encodeFunctionData({
        abi: balancerRouterAbi,
        functionName: 'removeLiquidityProportional',
        args: [
            input.poolId,
            input.bptIn.amount,
            minAmountsOut,
            !!input.wethIsEth,
            input.userData,
        ],
    });
};
