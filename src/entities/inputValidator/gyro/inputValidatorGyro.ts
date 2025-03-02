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
import { GyroECLPMath } from '@balancer-labs/balancer-maths';

const {
    _ONE,
    _ONE_XP,
    _DERIVED_TAU_NORM_ACCURACY_XP,
    _DERIVED_DSQ_NORM_ACCURACY_XP,
    _ROTATION_VECTOR_NORM_ACCURACY,
    _MAX_STRETCH_FACTOR,
    _MAX_INV_INVARIANT_DENOMINATOR_XP,
} = GyroECLPMath;

export class InputValidatorGyro extends InputValidatorBase {
    validateCreatePool(input: CreatePoolGyroECLPInput) {
        super.validateCreatePool(input);

        // validateParams
        const { eclpParams } = input;
        const { s, c, lambda } = eclpParams;

        // require(0 <= params.s && params.s <= _ONE, RotationVectorSWrong());
        if (s < 0n) throw new Error('RotationVectorSWrong: s must be >= 0');
        if (s > _ONE)
            throw new Error(`RotationVectorSWrong: s must be <= ${_ONE}`);

        // require(0 <= params.c && params.c <= _ONE, RotationVectorCWrong());
        if (c < 0n) throw new Error('RotationVectorCWrong: c must be >= 0');
        if (c > _ONE)
            throw new Error(`RotationVectorCWrong: c must be <= ${_ONE}`);

        // require(_ONE - _ROTATION_VECTOR_NORM_ACCURACY <= scnorm2 && scnorm2 <= _ONE + _ROTATION_VECTOR_NORM_ACCURACY,RotationVectorNotNormalized());
        const scnorm2 = GyroECLPMath.scalarProd({ x: s, y: c }, { x: s, y: c });
        if (scnorm2 < _ONE - _ROTATION_VECTOR_NORM_ACCURACY) {
            throw new Error(
                `RotationVectorNotNormalized: scnorm2 must be >= ${
                    _ONE - _ROTATION_VECTOR_NORM_ACCURACY
                }`,
            );
        }
        if (scnorm2 > _ONE + _ROTATION_VECTOR_NORM_ACCURACY) {
            throw new Error(
                `RotationVectorNotNormalized: scnorm2 must be <= ${
                    _ONE + _ROTATION_VECTOR_NORM_ACCURACY
                }`,
            );
        }

        // require(0 <= params.lambda && params.lambda <= _MAX_STRETCH_FACTOR, StretchingFactorWrong());
        if (lambda < 0n) {
            throw new Error('StretchingFactorWrong: lambda must be >= 0');
        }
        if (lambda > _MAX_STRETCH_FACTOR) {
            throw new Error(
                `StretchingFactorWrong: lambda must be <= ${_MAX_STRETCH_FACTOR}`,
            );
        }

        // validateDerivedParamsLimits
        const { derivedEclpParams } = input;
        const { tauAlpha, tauBeta, dSq, u, v, w, z } = derivedEclpParams;

        // require(derived.tauAlpha.y > 0, DerivedTauAlphaYWrong());
        if (tauAlpha.y <= 0n)
            throw new Error('DerivedTauAlphaYWrong: tuaAlpha.y must be > 0');

        // require(derived.tauBeta.y > 0, DerivedTauBetaYWrong());
        if (tauBeta.y <= 0n)
            throw new Error('DerivedTauBetaYWrong: tauBeta.y must be > 0');

        // require(derived.tauBeta.x > derived.tauAlpha.x, DerivedTauXWrong());
        if (tauBeta.x <= tauAlpha.x)
            throw new Error(
                'DerivedTauXWrong: derived.tauBeta.x must be > derived.tauAlpha.x',
            );

        // require(_ONE_XP - _DERIVED_TAU_NORM_ACCURACY_XP <= norm2 && norm2 <= _ONE_XP + _DERIVED_TAU_NORM_ACCURACY_XP,DerivedTauAlphaNotNormalized());
        const norm2 = GyroECLPMath.scalarProdXp(tauAlpha, tauAlpha);
        if (norm2 < _ONE_XP - _DERIVED_TAU_NORM_ACCURACY_XP)
            throw new Error(
                `DerivedTauBetaNotNormalized: norm2 must be >= ${
                    _ONE_XP - _DERIVED_TAU_NORM_ACCURACY_XP
                }`,
            );
        if (norm2 > _ONE_XP + _DERIVED_TAU_NORM_ACCURACY_XP)
            throw new Error(
                `DerivedTauBetaNotNormalized: norm2 must be <= ${
                    _ONE_XP + _DERIVED_TAU_NORM_ACCURACY_XP
                }`,
            );

        // require(derived.u <= _ONE_XP, DerivedUWrong());
        if (u > _ONE_XP)
            throw new Error(`DerivedUWrong: u must be <= ${_ONE_XP}`);
        // require(derived.v <= _ONE_XP, DerivedVWrong());
        if (v > _ONE_XP)
            throw new Error(`DerivedVWrong: v must be <= ${_ONE_XP}`);
        // require(derived.w <= _ONE_XP, DerivedWWrong());
        if (w > _ONE_XP)
            throw new Error(`DerivedWWrong: w must be <= ${_ONE_XP}`);
        // require(derived.z <= _ONE_XP, DerivedZWrong());
        if (z > _ONE_XP)
            throw new Error(`DerivedZWrong: z must be <= ${_ONE_XP}`);

        // require(_ONE_XP - _DERIVED_DSQ_NORM_ACCURACY_XP <= derived.dSq && derived.dSq <= _ONE_XP + _DERIVED_DSQ_NORM_ACCURACY_XP, DerivedDsqWrong());
        if (dSq < _ONE_XP - _DERIVED_DSQ_NORM_ACCURACY_XP)
            throw new Error(
                `DerivedDSqWrong: dSq must be >= ${
                    _ONE_XP - _DERIVED_DSQ_NORM_ACCURACY_XP
                }`,
            );
        if (dSq > _ONE_XP + _DERIVED_DSQ_NORM_ACCURACY_XP)
            throw new Error(
                `DerivedDSqWrong: dSq must be <= ${
                    _ONE_XP + _DERIVED_DSQ_NORM_ACCURACY_XP
                }`,
            );

        // require(mulDenominator <= _MAX_INV_INVARIANT_DENOMINATOR_XP, InvariantDenominatorWrong());
        const achiachi = GyroECLPMath.calcAChiAChiInXp(
            eclpParams,
            derivedEclpParams,
        );
        const mulDenominator = (_ONE_XP * _ONE_XP) / achiachi;
        if (mulDenominator > _MAX_INV_INVARIANT_DENOMINATOR_XP)
            throw new Error(
                `InvariantDenominatorWrong: mulDenominator must be <= ${_MAX_INV_INVARIANT_DENOMINATOR_XP}`,
            );
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
