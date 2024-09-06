import { encodeFunctionData } from 'viem';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { balancerRouterAbi } from '@/abi';

export const encodeRemoveLiquidityRecovery = (
    input: RemoveLiquidityBaseBuildCallInput,
) => {
    return encodeFunctionData({
        abi: [...balancerRouterAbi],
        functionName: 'removeLiquidityRecovery',
        args: [input.poolId, input.bptIn.amount],
    });
};
