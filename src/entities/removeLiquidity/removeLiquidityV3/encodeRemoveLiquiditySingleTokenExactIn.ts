import { encodeFunctionData, Hex } from 'viem';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { balancerRouterAbiExtended } from '@/abi';

export const encodeRemoveLiquiditySingleTokenExactIn = (
    input: RemoveLiquidityBaseBuildCallInput & { userData: Hex },
    minAmountsOut: bigint[],
) => {
    // just a sanity check as this is already checked in InputValidator
    if (input.tokenOutIndex === undefined) {
        throw new Error(
            'RemoveLiquidityKind.SingleTokenExactOut should have tokenOutIndex',
        );
    }
    return encodeFunctionData({
        abi: balancerRouterAbiExtended,
        functionName: 'removeLiquiditySingleTokenExactIn',
        args: [
            input.poolId,
            input.bptIn.amount,
            input.amountsOut[input.tokenOutIndex].token.address,
            minAmountsOut[input.tokenOutIndex],
            !!input.wethIsEth,
            input.userData,
        ],
    });
};
