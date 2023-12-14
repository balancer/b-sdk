import { Address, encodeFunctionData, parseEther } from 'viem';
import { composableStableFactoryV5Abi } from '../../../abi/composableStableFactoryV5';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolComposableStableArgs,
    CreatePoolComposableStableInput,
} from '../types';
import { getRandomBytes32 } from '../../utils/getRandomBytes32';

export class CreatePoolComposableStable implements CreatePoolBase {
    buildCall(
        input: CreatePoolComposableStableInput,
    ): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: composableStableFactoryV5Abi,
            functionName: 'create',
            args,
        });
        return { call: encodedCall };
    }

    private parseCreateFunctionArgs(
        input: CreatePoolComposableStableInput,
    ): CreatePoolComposableStableArgs {
        const sortedTokenParams = input.tokens.sort(
            ({ tokenAddress: address1 }, { tokenAddress: address2 }) => {
                const diff = BigInt(address1) - BigInt(address2);
                return diff > 0 ? 1 : diff < 0 ? -1 : 0;
            },
        );

        const [tokens, rateProviders, tokenRateCacheDurations] =
            sortedTokenParams.reduce(
                (acc, curr) => {
                    acc[0].push(curr.tokenAddress);
                    acc[1].push(curr.rateProvider);
                    acc[2].push(curr.tokenRateCacheDuration);
                    return acc;
                },
                [[], [], []] as [Address[], Address[], string[]],
            );

        return [
            input.name || input.symbol,
            input.symbol,
            tokens,
            BigInt(input.amplificationParameter),
            rateProviders,
            tokenRateCacheDurations.map(BigInt),
            input.exemptFromYieldProtocolFeeFlag,
            parseEther(input.swapFee),
            input.poolOwnerAddress,
            input.salt || getRandomBytes32(),
        ];
    }
}
