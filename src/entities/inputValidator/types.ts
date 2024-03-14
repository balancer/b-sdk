import { AddLiquidityInput } from '../addLiquidity/types';
import { CreatePoolInput } from '../createPool/types';
import { InitPoolInput } from '../initPool/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../removeLiquidity/types';
import { PoolState, PoolStateWithBalances } from '../types';

export interface InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void;

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void;

    validateRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolStateWithBalances: PoolStateWithBalances,
    ): void;

    validateCreatePool(input: CreatePoolInput): void;

    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState): void;
}
