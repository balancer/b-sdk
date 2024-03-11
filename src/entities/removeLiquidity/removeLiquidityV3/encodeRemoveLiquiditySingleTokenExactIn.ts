import { encodeFunctionData } from 'viem';
import { RemoveLiquidityBaseCall } from '../types';
import { balancerRouterAbi } from '@/abi';

export const encodeRemoveLiquiditySingleTokenExactIn = (
    input: RemoveLiquidityBaseCall,
    minAmountsOut: bigint[],
) => {
    // just a sanity check as this is already checked in InputValidator
    if (input.tokenOutIndex === undefined) {
        throw new Error(
            'RemoveLiquidityKind.SingleTokenExactOut should have tokenOutIndex',
        );
    }
    return encodeFunctionData({
        abi: balancerRouterAbi,
        functionName: 'removeLiquiditySingleTokenExactIn',
        args: [
            input.poolId,
            input.bptIn.amount,
            input.amountsOut[input.tokenOutIndex].token.address,
            minAmountsOut[input.tokenOutIndex],
            !!input.wethIsEth,
            '0x',
        ],
    });
};
