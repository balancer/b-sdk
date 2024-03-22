import { removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError } from '@/utils';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { encodeFunctionData } from 'viem';
import { balancerRouterAbi } from '@/abi';
import { Hex } from '@/types';

export const encodeRemoveLiquiditySingleTokenExactOut = (
    input: RemoveLiquidityBaseBuildCallInput,
    maxBptAmountIn: bigint,
): Hex => {
    // just a sanity check as this is already checked in InputValidator
    if (input.tokenOutIndex === undefined) {
        throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;
    }
    return encodeFunctionData({
        abi: balancerRouterAbi,
        functionName: 'removeLiquiditySingleTokenExactOut',
        args: [
            input.poolId,
            maxBptAmountIn,
            input.amountsOut[input.tokenOutIndex].token.address,
            input.amountsOut[input.tokenOutIndex].amount,
            !!input.wethIsEth,
            '0x',
        ],
    });
};
