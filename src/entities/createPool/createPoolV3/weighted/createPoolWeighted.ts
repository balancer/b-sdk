import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData } from 'viem';
import {
    CreatePoolBase,
    CreatePoolV3WeightedInput,
    CreatePoolBuildCallOutput,
    CreatePoolV3WeightedArgs,
    TokenConfig,
} from '../../types';
import { weightedPoolFactoryAbi_V3 } from '@/abi/weightedPoolFactory.V3';
import { WEIGHTED_POOL_FACTORY_BALANCER_V3 } from '@/utils';
import { sortByAddress } from '@/utils/sortByAddress';

export class CreatePoolWeightedV3 implements CreatePoolBase {
    buildCall(input: CreatePoolV3WeightedInput): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: weightedPoolFactoryAbi_V3,
            functionName: 'create',
            args,
        });
        return {
            callData: encodedCall,
            to: WEIGHTED_POOL_FACTORY_BALANCER_V3[input.chainId],
        };
    }

    private parseCreateFunctionArgs(
        input: CreatePoolV3WeightedInput,
    ): CreatePoolV3WeightedArgs {
        const sortedTokenParams = sortByAddress(input.tokens);

        const [tokenConfigs, normalizedWeights] = sortedTokenParams.reduce(
            (
                acc,
                {
                    address: tokenAddress,
                    rateProvider,
                    weight,
                    tokenType,
                    yieldFeeExempt,
                },
            ) => {
                acc[0].push({
                    token: tokenAddress,
                    tokenType,
                    rateProvider,
                    yieldFeeExempt: yieldFeeExempt ?? false,
                });
                acc[1].push(weight);
                return acc;
            },
            [[], []] as [TokenConfig[], bigint[]],
        );

        return [
            input.name || input.symbol,
            input.symbol,
            tokenConfigs,
            normalizedWeights,
            input.salt || getRandomBytes32(),
        ];
    }
}
