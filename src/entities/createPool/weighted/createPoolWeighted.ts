import { Address, encodeFunctionData, parseEther, zeroAddress } from 'viem';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreateWeightedPoolArgs,
    CreateWeightedPoolInput,
} from '../types';
import { getRandomBytes32 } from '../../utils/getRandomBytes32';
import { weightedFactoryV4Abi } from '../../../abi/weightedFactoryV4';

export class CreatePoolWeighted implements CreatePoolBase {
    buildCall(input: CreateWeightedPoolInput): CreatePoolBuildCallOutput {
        const args = this.parseCreateFunctionArgs(input);
        const encodedCall = encodeFunctionData({
            abi: weightedFactoryV4Abi,
            functionName: 'create',
            args,
        });
        return { call: encodedCall };
    }

    private parseCreateFunctionArgs(
        input: CreateWeightedPoolInput,
    ): CreateWeightedPoolArgs {
        const sortedTokenParams = input.tokens
            .sort((address1, address2) => {
                const diff = BigInt(address1) - BigInt(address2);
                return diff > 0 ? 1 : diff < 0 ? -1 : 0;
            })
            .map((tokenAddress, index) => {
                let weight: number =
                    input.tokens.length === 3 && index === 0
                        ? 1 / input.tokens.length + 1e-16 // 1e-16 is added to avoid rounding errors for 3 tokens so the weights will be [0.333..4, 0.333..3, 0.333..3]
                        : 1 / input.tokens.length;
                let rateProvider: Address = zeroAddress;
                if (input.weights !== undefined) {
                    weight = input.weights.find(
                        (w) => w.tokenAddress === tokenAddress,
                    )?.weight as number;
                }
                if (input.rateProviders !== undefined) {
                    rateProvider = input.rateProviders.find(
                        (rp) => rp.tokenAddress === tokenAddress,
                    )?.rateProviderAddress as Address;
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
                acc[1].push(parseEther(String(curr.weight)));
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
