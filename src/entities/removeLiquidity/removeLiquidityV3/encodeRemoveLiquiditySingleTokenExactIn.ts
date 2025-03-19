import { encodeFunctionData } from 'viem';
import { RemoveLiquidityV3BuildCallInput } from '../types';
import { balancerRouterAbiExtended } from '@/abi';
import { missingParameterError } from '@/utils';

export const encodeRemoveLiquiditySingleTokenExactIn = (
    input: RemoveLiquidityV3BuildCallInput,
    minAmountsOut: bigint[],
) => {
    // TODO: move this check to an input validator
    if (input.tokenOutIndex === undefined) {
        throw missingParameterError(
            'RemoveLiquidity SingleTokenExactIn',
            'tokenOutIndex',
            input.protocolVersion,
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
