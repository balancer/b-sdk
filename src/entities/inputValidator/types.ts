import { AddLiquidityInput } from '../addLiquidity';
import { CreatePoolInput } from '../createPool/types';
import { InitPoolInput } from '../initPool/types';
import { RemoveLiquidityInput } from '../removeLiquidity';
import { PoolStateInput } from '../types';

export interface InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput | InitPoolInput,
        poolState: PoolStateInput,
    ): void;

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolStateInput,
    ): void;

    validateCreatePool(input: CreatePoolInput): void;
}
