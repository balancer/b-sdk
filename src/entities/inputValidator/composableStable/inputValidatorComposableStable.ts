import { AddLiquidityInput } from '../../addLiquidity';
import { CreatePoolComposableStableInput } from '../../createPool/types';
import { RemoveLiquidityInput } from '../../removeLiquidity';
import { PoolStateInput } from '../../types';
import { InputValidatorBase } from '../types';
import {
    validateCreatePoolTokens,
    validatePoolHasBpt,
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';

export class InputValidatorComposableStable implements InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolStateInput,
    ): void {
        validatePoolHasBpt(poolState);
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolStateInput,
    ): void {
        validatePoolHasBpt(poolState);
        validateTokensRemoveLiquidity(input, poolState);
    }

    validateCreatePool(input: CreatePoolComposableStableInput): void {
        validateCreatePoolTokens(input.tokens);
        if (input.tokens.length > 5) {
            throw new Error(
                'Composable stable pools can have a maximum of 5 tokens',
            );
        }
        if (BigInt(input.amplificationParameter) <= BigInt(0)) {
            throw new Error('Amplification parameter must be greater than 0');
        } else if (BigInt(input.amplificationParameter) > BigInt(5000)) {
            throw new Error(
                'Amplification parameter must be equal or lower than 5000',
            );
        }
        return;
    }
}
