import { RemoveLiquidityInput } from '@/entities/removeLiquidity/types';
import {
    CreatePoolV2WeightedInput,
    CreatePoolV3WeightedInput,
} from '../../createPool/types';
import { InitPoolInput } from '../../initPool/types';
import { PoolState } from '../../types';
import { InputValidatorBase } from '../types';
import {
    validateCreatePoolTokens,
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';
import { TokenType } from '@/types';
import { zeroAddress } from 'viem';
import { AddLiquidityInput } from '@/entities/addLiquidity/types';

export class InputValidatorWeighted implements InputValidatorBase {
    validateCreatePool(
        input: CreatePoolV2WeightedInput | CreatePoolV3WeightedInput,
    ) {
        validateCreatePoolTokens(input.tokens);
        if (input.tokens.length > 8) {
            throw new Error('Weighted pools can have a maximum of 8 tokens');
        }
        const weightsSum = input.tokens.reduce(
            (acc, { weight }) => acc + weight,
            0n,
        );
        if (weightsSum !== BigInt(1e18)) {
            throw new Error('Weights must sum to 1e18');
        }
        if (input.tokens.find(({ weight }) => weight === 0n)) {
            throw new Error('Weight cannot be 0');
        }
        if (input.balancerVersion === 3) {
            input.tokens.forEach(({ tokenType, rateProvider }) => {
                if (
                    tokenType !== TokenType.STANDARD &&
                    rateProvider === zeroAddress
                ) {
                    throw new Error(
                        'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
                    );
                }
            });
        }
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput | InitPoolInput,
        poolState: PoolState,
    ): void {
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        validateTokensRemoveLiquidity(input, poolState);
    }
}
