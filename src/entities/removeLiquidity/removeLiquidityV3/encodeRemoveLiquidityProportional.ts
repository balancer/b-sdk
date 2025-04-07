import { encodeFunctionData } from 'viem';
import { RemoveLiquidityV3BuildCallInput } from '../types';
import { balancerRouterAbiExtended } from '@/abi';

export const encodeRemoveLiquidityProportional = (
    input: RemoveLiquidityV3BuildCallInput,
    minAmountsOut: bigint[],
) => {
    return encodeFunctionData({
        abi: balancerRouterAbiExtended,
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
