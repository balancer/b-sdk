import { encodeFunctionData } from 'viem';
import { balancerRouterAbiExtended } from '@/abi';
import { Hex } from '@/types';
import { missingParameterError } from '@/utils';
import { RemoveLiquidityBaseBuildCallInput } from '../types';

export const encodeRemoveLiquiditySingleTokenExactOut = (
    input: RemoveLiquidityBaseBuildCallInput & { userData: Hex },
    maxBptAmountIn: bigint,
): Hex => {
    // just a sanity check as this is already checked in InputValidator
    if (input.tokenOutIndex === undefined) {
        throw missingParameterError(
            'Remove Liquidity SingleTokenExactOut',
            'tokenOutIndex',
            input.protocolVersion,
        );
    }
    return encodeFunctionData({
        abi: balancerRouterAbiExtended,
        functionName: 'removeLiquiditySingleTokenExactOut',
        args: [
            input.poolId,
            maxBptAmountIn,
            input.amountsOut[input.tokenOutIndex].token.address,
            input.amountsOut[input.tokenOutIndex].amount,
            !!input.wethIsEth,
            input.userData,
        ],
    });
};
