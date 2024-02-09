import { Address, encodeFunctionData, parseEther } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolV2WeightedArgs,
    CreatePoolV2WeightedInput,
} from '../../types';
import { getRandomBytes32 } from '../../../utils/getRandomBytes32';
import { weightedPoolFactoryV2Abi } from '../../../../abi/weightedPoolFactory.V2';

export class CreatePoolWeightedV2 implements CreatePoolBase {
    buildCall(input: CreatePoolV2WeightedInput): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: weightedPoolFactoryV2Abi,
            functionName: 'create',
            args,
        });
        return { call: encodedCall };
    }

    private parseCreateFunctionArgs(
        input: CreatePoolV2WeightedInput,
    ): CreatePoolV2WeightedArgs {
        const sortedTokenParams = input.tokens.sort(
            ({ tokenAddress: address1 }, { tokenAddress: address2 }) => {
                const diff = BigInt(address1) - BigInt(address2);
                return diff > 0 ? 1 : diff < 0 ? -1 : 0;
            },
        );

        const [tokens, weights, rateProviders] = sortedTokenParams.reduce(
            (acc, curr) => {
                acc[0].push(curr.tokenAddress);
                acc[1].push(curr.weight);
                acc[2].push(curr.rateProvider);
                return acc;
            },
            [[], [], []] as [Address[], bigint[], Address[]],
        );

        return [
            input.name || input.symbol,
            input.symbol,
            tokens,
            weights,
            rateProviders,
            parseEther(input.swapFee),
            input.poolOwnerAddress,
            input.salt || getRandomBytes32(),
        ];
    }
}
