import { AddLiquidityInput, AddLiquidityKind } from '../../addLiquidity/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../../removeLiquidity/types';
import { PoolState } from '../../types';
import { InputValidatorBase } from '../inputValidatorBase';
import {
    validateTokensAddLiquidity,
    validateTokensRemoveLiquidity,
} from '../utils/validateTokens';
import {
    addLiquidityProportionalOnlyError,
    poolTypeError,
    protocolVersionError,
} from '@/utils';

export class InputValidatorCowAmm extends InputValidatorBase {
    validateInitPool(): void {
        throw protocolVersionError('Init Pool', 1);
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        if (addLiquidityInput.kind !== AddLiquidityKind.Proportional) {
            throw addLiquidityProportionalOnlyError(
                addLiquidityInput.kind,
                poolState.type,
            );
        }
        validateTokensAddLiquidity(addLiquidityInput, poolState);
    }

    validateRemoveLiquidity(
        removeLiquidityInput: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        if (removeLiquidityInput.kind !== RemoveLiquidityKind.Proportional) {
            throw poolTypeError(
                `Remove Liquidity ${removeLiquidityInput.kind}`,
                poolState.type,
                'Use Remove Liquidity Proportional',
            );
        }
        validateTokensRemoveLiquidity(removeLiquidityInput, poolState);
    }

    validateCreatePool(): void {
        throw protocolVersionError('Create Pool', 1);
    }
}
