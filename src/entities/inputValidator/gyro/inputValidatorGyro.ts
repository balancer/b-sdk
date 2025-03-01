import { parseUnits } from 'viem';
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
    removeLiquidityProportionalOnlyError,
} from '@/utils';
import { CreatePoolGyroECLPInput } from '@/entities/createPool';

export const _ONE = parseUnits('1', 18);
export const _ROTATION_VECTOR_NORM_ACCURACY = parseUnits('1', 3);
export const _MAX_STRETCH_FACTOR = parseUnits('1', 26);

export class InputValidatorGyro extends InputValidatorBase {
    validateCreatePool(input: CreatePoolGyroECLPInput) {
        super.validateCreatePool(input);

        // validateParams
        const { eclpParams } = input;
        const { s, c, lambda } = eclpParams;

        if (s < 0n || s > _ONE)
            throw new Error('EclpParams.s must be between 0 and 1e18');
        if (c < 0n || c > _ONE)
            throw new Error('EclpParams.c must be between 0 and 1e18');

        const scnorm2 = (s * s + c * c) / _ONE;

        if (
            scnorm2 < _ONE - _ROTATION_VECTOR_NORM_ACCURACY ||
            scnorm2 > _ONE + _ROTATION_VECTOR_NORM_ACCURACY
        ) {
            throw new Error('Rotation Vector Not Normalized');
        }

        if (lambda < 0n || lambda > _MAX_STRETCH_FACTOR) {
            throw new Error('Stretching Factor Wrong');
        }

        // validateDerivedParamsLimits
        // TODO
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
            throw removeLiquidityProportionalOnlyError(
                removeLiquidityInput.kind,
                poolState.type,
            );
        }
        validateTokensRemoveLiquidity(removeLiquidityInput, poolState);
    }
}
