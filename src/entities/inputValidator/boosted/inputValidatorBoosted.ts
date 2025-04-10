import { Address } from 'viem';
import { PoolStateWithUnderlyings } from '@/entities/types';
import { InputValidatorBase } from '../inputValidatorBase';
import { AddLiquidityKind } from '@/entities/addLiquidity/types';
import { AddLiquidityBoostedInput } from '@/entities/addLiquidityBoosted/types';
import {
    inputValidationError,
    isSameAddress,
    protocolVersionError,
} from '@/utils';
import {
    CreatePoolStableSurgeInput,
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
            throw protocolVersionError(
                'Add Liquidity Boosted',
                poolState.protocolVersion,
            );
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
                    throw inputValidationError(
                        'Add Liquidity Boosted',
                        `amountIn address ${a.address} should exist in poolState tokens`,
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
                    throw inputValidationError(
                        'Add Liquidity Boosted',
                        `referenceAmount address ${addLiquidityInput.referenceAmount.address} should exist in tokensIn`,
                    );
                }
            }
        }
    }
    validateCreatePool(
        input:
            | CreatePoolV3WeightedInput
            | CreatePoolV3StableInput
            | CreatePoolStableSurgeInput,
    ): void {
        validateCreatePoolTokens(input.tokens);
        validateCreatePoolTokenConfig(input);
    }
}
