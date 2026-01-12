import { AddLiquidityInput } from '../../addLiquidity/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { PoolState, PoolStateWithBalances } from '../../types';
import { InputValidatorBase } from '../inputValidatorBase';
import { validatePoolHasBpt } from '../utils/validateTokens';

export class InputValidatorComposableStable extends InputValidatorBase {
    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        super.validateAddLiquidity(addLiquidityInput, poolState);
        validatePoolHasBpt('Add Liquidity', poolState);
    }

    validateRemoveLiquidity(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        super.validateRemoveLiquidity(input, poolState);
        validatePoolHasBpt('Remove Liquidity', poolState);
    }

    validateRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolStateWithBalances: PoolStateWithBalances,
    ): void {
        super.validateRemoveLiquidityRecovery(input, poolStateWithBalances);
        validatePoolHasBpt('Remove Liquidity Recovery', poolStateWithBalances);
    }
}
