import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolV3WeightedInput,
    CreatePoolBuildCallOutput,
    PoolRoleAccounts,
} from '../../types';
import { weightedPoolFactoryAbi_V3 } from '@/abi/weightedPoolFactory.V3';
import { WEIGHTED_POOL_FACTORY_BALANCER_V3, sortByAddress } from '@/utils';
import { Hex } from '@/types';

export class CreatePoolWeightedV3 implements CreatePoolBase {
    buildCall(input: CreatePoolV3WeightedInput): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: WEIGHTED_POOL_FACTORY_BALANCER_V3[input.chainId],
        };
    }

    private encodeCall(input: CreatePoolV3WeightedInput): Hex {
        const sortedTokenConfigs = sortByAddress(input.tokens);

        const normalizedWeights: bigint[] = [];
        const tokens = sortedTokenConfigs.map(({ weight, ...rest }) => {
            normalizedWeights.push(weight);
            return {
                token: rest.address,
                ...rest,
            };
        });

        const roleAccounts: PoolRoleAccounts = {
            pauseManager: input.pauseManager,
            swapFeeManager: input.swapFeeManager,
            poolCreator: zeroAddress,
        };

        const args = [
            input.name || input.symbol,
            input.symbol,
            tokens,
            normalizedWeights,
            roleAccounts,
            input.swapFeePercentage,
            input.poolHooksContract,
            input.enableDonation,
            input.disableUnbalancedLiquidity,
            input.salt || getRandomBytes32(),
        ] as const;

        return encodeFunctionData({
            abi: weightedPoolFactoryAbi_V3,
            functionName: 'create',
            args,
        });
    }
}
