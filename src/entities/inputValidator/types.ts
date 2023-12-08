import { AddLiquidityInput } from '../addLiquidity';
import { CreatePoolInput } from '../createPool/types';
import { RemoveLiquidityInput } from '../removeLiquidity';
import { PoolStateInput } from '../types';

export interface InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolStateInput,
    ): void;

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolStateInput,
    ): void;

    validateCreatePool(input: CreatePoolInput): void;
}
