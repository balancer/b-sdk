import { encodeFunctionData } from 'viem';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { balancerRouterAbiExtended } from '@/abi';

export const encodeRemoveLiquidityRecovery = (
    input: RemoveLiquidityBaseBuildCallInput,
    minAmountsOut: bigint[],
) => {
    return encodeFunctionData({
        abi: balancerRouterAbiExtended,
        functionName: 'removeLiquidityRecovery',
        args: [input.poolId, input.bptIn.amount, minAmountsOut],
    });
};
