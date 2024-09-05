import { encodeFunctionData } from 'viem';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { balancerRouterAbi, vaultExtensionV3Abi, vaultV3Abi } from '@/abi';

export const encodeRemoveLiquidityProportional = (
    input: RemoveLiquidityBaseBuildCallInput,
    minAmountsOut: bigint[],
) => {
    return encodeFunctionData({
        abi: [...balancerRouterAbi, ...vaultV3Abi, ...vaultExtensionV3Abi],
        functionName: 'removeLiquidityProportional',
        args: [
            input.poolId,
            input.bptIn.amount,
            minAmountsOut,
            !!input.wethIsEth,
            '0x',
        ],
    });
};
