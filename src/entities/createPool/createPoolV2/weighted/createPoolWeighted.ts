import { Address, encodeFunctionData, parseEther } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolV2WeightedArgs,
    CreatePoolV2WeightedInput,
} from '../../types';
import { getRandomBytes32 } from '../../../utils/getRandomBytes32';
import { weightedPoolFactoryV4Abi_V2 } from '../../../../abi/weightedPoolFactoryV4.V2';
import { WEIGHTED_POOL_FACTORY_BALANCER_V2 } from '@/utils/constantsV2';
import { sortByAddress } from '@/utils/sortByAddress';

export class CreatePoolWeightedV2 implements CreatePoolBase {
    buildCall(input: CreatePoolV2WeightedInput): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: weightedPoolFactoryV4Abi_V2,
            functionName: 'create',
            args,
        });
        return {
            callData: encodedCall,
            to: WEIGHTED_POOL_FACTORY_BALANCER_V2[input.chainId],
        };
    }

    private parseCreateFunctionArgs(
        input: CreatePoolV2WeightedInput,
    ): CreatePoolV2WeightedArgs {
        const sortedTokenParams = sortByAddress(input.tokens);

        const [tokens, weights, rateProviders] = sortedTokenParams.reduce(
            (acc, curr) => {
                acc[0].push(curr.address);
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
