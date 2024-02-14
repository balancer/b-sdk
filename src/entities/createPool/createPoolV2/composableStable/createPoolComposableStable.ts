import { Address, encodeFunctionData, parseEther } from 'viem';
import { composableStableFactoryV2Abi } from '../../../../abi/composableStableFactory.V2';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolV2ComposableStableArgs,
    CreatePoolV2ComposableStableInput,
} from '../../types';
import { getRandomBytes32 } from '../../../utils/getRandomBytes32';
import { COMPOSABLE_STABLE_POOL_FACTORY } from '@/utils';
import { sortByAddress } from '@/utils/sortByAddress';

export class CreatePoolComposableStableV2 implements CreatePoolBase {
    buildCall(
        input: CreatePoolV2ComposableStableInput,
    ): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: composableStableFactoryV2Abi,
            functionName: 'create',
            args,
        });
        return {
            call: encodedCall,
            to: COMPOSABLE_STABLE_POOL_FACTORY[input.chainId],
        };
    }

    private parseCreateFunctionArgs(
        input: CreatePoolV2ComposableStableInput,
    ): CreatePoolV2ComposableStableArgs {
        const sortedTokenParams = sortByAddress(input.tokens);

        const [tokens, rateProviders, tokenRateCacheDurations] =
            sortedTokenParams.reduce(
                (acc, curr) => {
                    acc[0].push(curr.address);
                    acc[1].push(curr.rateProvider);
                    acc[2].push(curr.tokenRateCacheDuration);
                    return acc;
                },
                [[], [], []] as [Address[], Address[], bigint[]],
            );

        return [
            input.name || input.symbol,
            input.symbol,
            tokens,
            input.amplificationParameter,
            rateProviders,
            tokenRateCacheDurations,
            input.exemptFromYieldProtocolFeeFlag,
            parseEther(input.swapFee),
            input.poolOwnerAddress,
            input.salt || getRandomBytes32(),
        ];
    }
}
