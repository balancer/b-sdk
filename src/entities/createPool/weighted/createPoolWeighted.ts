import { Address, encodeFunctionData, parseEther } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolWeightedArgs,
    CreatePoolWeightedInput,
} from '../types';
import { getRandomBytes32 } from '../../utils/getRandomBytes32';
import { weightedFactoryV4Abi } from '../../../abi/weightedFactoryV4';

export class CreatePoolWeighted implements CreatePoolBase {
    buildCall(input: CreatePoolWeightedInput): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: weightedFactoryV4Abi,
            functionName: 'create',
            args,
        });
        return { call: encodedCall };
    }

    private parseCreateFunctionArgs(
        input: CreatePoolWeightedInput,
    ): CreatePoolWeightedArgs {
        const sortedTokenParams = input.tokens
            .sort((address1, address2) => {
                const diff = BigInt(address1) - BigInt(address2);
                return diff > 0 ? 1 : diff < 0 ? -1 : 0;
            })
            .map((tokenAddress) => {
                const weight: string | undefined = input.weights.find(
                    (w) => w.tokenAddress === tokenAddress,
                )?.weight;
                const rateProvider: Address | undefined =
                    input.rateProviders.find(
                        (rp) => rp.tokenAddress === tokenAddress,
                    )?.rateProviderAddress;
                if (!weight) {
                    throw new Error(
                        `Weight not found for token: ${tokenAddress}`,
                    );
                }
                if (!rateProvider) {
                    throw new Error(
                        `Rate provider not found for token: ${tokenAddress}`,
                    );
                }
                return {
                    tokenAddress,
                    weight,
                    rateProvider,
                };
            });

        const [tokens, weights, rateProviders] = sortedTokenParams.reduce(
            (acc, curr) => {
                acc[0].push(curr.tokenAddress);
                acc[1].push(BigInt(curr.weight));
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
