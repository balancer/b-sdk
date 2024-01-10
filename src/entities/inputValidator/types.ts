import { AddLiquidityInput } from '../addLiquidity/types';
import { CreatePoolInput } from '../createPool/types';
import { InitPoolInput } from '../initPool/types';
import { RemoveLiquidityInput } from '../removeLiquidity/types';
import { PoolState } from '../types';

export interface InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput | InitPoolInput,
        poolState: PoolState,
    ): void;

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void;

    validateCreatePool(input: CreatePoolInput): void;
}
