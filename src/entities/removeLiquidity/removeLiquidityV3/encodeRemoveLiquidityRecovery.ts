import { encodeFunctionData } from 'viem';
import { RemoveLiquidityBaseBuildCallInput } from '../types';
import { balancerRouterAbi, vaultExtensionV3Abi, vaultV3Abi } from '@/abi';

export const encodeRemoveLiquidityRecovery = (
    input: RemoveLiquidityBaseBuildCallInput,
) => {
    return encodeFunctionData({
        abi: [...balancerRouterAbi, ...vaultV3Abi, ...vaultExtensionV3Abi],
        functionName: 'removeLiquidityRecovery',
        args: [input.poolId, input.bptIn.amount],
    });
};
