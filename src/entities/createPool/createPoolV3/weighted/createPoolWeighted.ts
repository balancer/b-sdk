import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData } from 'viem';
import {
    CreatePoolBase,
    CreatePoolV3WeightedInput,
    CreatePoolBuildCallOutput,
    CreatePoolV3WeightedArgs,
    TokenConfig,
} from '../../types';
import { weightedPoolFactoryV3Abi } from '@/abi/weightedPoolFactory.V3';

export class CreatePoolWeightedV3 implements CreatePoolBase {
    buildCall(input: CreatePoolV3WeightedInput): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: weightedPoolFactoryV3Abi,
            functionName: 'create',
            args,
        });
        return { call: encodedCall };
    }

    private parseCreateFunctionArgs(
        input: CreatePoolV3WeightedInput,
    ): CreatePoolV3WeightedArgs {
        const sortedTokenParams = input.tokens.sort(
            ({ tokenAddress: address1 }, { tokenAddress: address2 }) => {
                const diff = BigInt(address1) - BigInt(address2);
                return diff > 0 ? 1 : diff < 0 ? -1 : 0;
            },
        );

        const [tokenConfigs, normalizedWeights] = sortedTokenParams.reduce(
            (
                acc,
                {
                    tokenAddress,
                    rateProvider,
                    weight,
                    tokenType,
                    yieldFeeExempt,
                },
            ) => {
                acc[0].push([
                    tokenAddress,
                    tokenType,
                    rateProvider,
                    yieldFeeExempt ?? false,
                ]);
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
