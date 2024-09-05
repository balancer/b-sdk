import { encodeFunctionData } from 'viem';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { balancerRouterAbi, vaultExtensionV3Abi, vaultV3Abi } from '@/abi';

export const encodeRemoveLiquiditySingleTokenExactIn = (
    input: RemoveLiquidityBaseBuildCallInput,
    minAmountsOut: bigint[],
) => {
    // just a sanity check as this is already checked in InputValidator
    if (input.tokenOutIndex === undefined) {
        throw new Error(
            'RemoveLiquidityKind.SingleTokenExactOut should have tokenOutIndex',
        );
    }
    return encodeFunctionData({
        abi: [...balancerRouterAbi, ...vaultV3Abi, ...vaultExtensionV3Abi],
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
