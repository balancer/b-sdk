import { AddLiquidityInput } from '../../addLiquidity';
import { CreatePoolWeightedInput } from '../../createPool/types';
import { RemoveLiquidityInput } from '../../removeLiquidity';
import { PoolStateInput } from '../../types';
import { InputValidatorBase } from '../types';
import {
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

    validateCreatePool(input: CreatePoolWeightedInput): void {
        console.log(input);
        throw new Error('Method not implemented.');
    }
}
