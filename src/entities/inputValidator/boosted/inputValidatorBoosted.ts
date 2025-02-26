import { Address } from 'viem';
import { PoolStateWithUnderlyings } from '@/entities/types';
import { InputValidatorBase } from '../inputValidatorBase';
import { AddLiquidityKind } from '@/entities/addLiquidity/types';
import { AddLiquidityBoostedInput } from '@/entities/addLiquidityBoosted/types';
import { isSameAddress } from '@/utils';
import {
    CreatePoolStableSurgeInput,
    CreatePoolV2ComposableStableInput,
    CreatePoolV2WeightedInput,
    CreatePoolV3StableInput,
    CreatePoolV3WeightedInput,
} from '@/entities/createPool';
import { validateCreatePoolTokenConfig } from '../utils/validateCreatePoolTokenConfig';
import { validateCreatePoolTokens } from '../utils/validateTokens';
export class InputValidatorBoosted extends InputValidatorBase {
    validateAddLiquidityBoosted(
        addLiquidityInput: AddLiquidityBoostedInput,
        poolState: PoolStateWithUnderlyings,
    ): void {
        //check if poolState.protocolVersion is 3
        if (poolState.protocolVersion !== 3) {
            throw new Error('protocol version must be 3');
        }

        if (addLiquidityInput.kind === AddLiquidityKind.Unbalanced) {
            // List of all tokens that can be added to the pool
            const poolTokens = poolState.tokens
                .flatMap((token) => [
                    token.address.toLowerCase(),
                    token.underlyingToken?.address.toLowerCase(),
                ])
                .filter(Boolean);

            addLiquidityInput.amountsIn.forEach((a) => {
                if (!poolTokens.includes(a.address.toLowerCase() as Address)) {
                    throw new Error(
                        `Address ${a.address} is not contained in the pool's parent or child tokens.`,
                    );
                }
            });
        }

        if (addLiquidityInput.kind === AddLiquidityKind.Proportional) {
            // if referenceAmount is not the BPT, it must be included in tokensIn
            if (
                !isSameAddress(
                    addLiquidityInput.referenceAmount.address,
                    poolState.address,
                )
            ) {
                if (
                    addLiquidityInput.tokensIn.findIndex((tokenIn) =>
                        isSameAddress(
                            tokenIn,
                            addLiquidityInput.referenceAmount.address,
                        ),
                    ) === -1
                ) {
                    throw new Error(
                        'tokensIn must contain referenceAmount token address',
                    );
                }
            }
        }
    }
    validateCreatePool(
        input:
            | CreatePoolV2WeightedInput
            | CreatePoolV2ComposableStableInput
            | CreatePoolV3WeightedInput
            | CreatePoolV3StableInput
            | CreatePoolStableSurgeInput,
    ): void {
        validateCreatePoolTokens(input.tokens);
        validateCreatePoolTokenConfig(input);
    }
}
