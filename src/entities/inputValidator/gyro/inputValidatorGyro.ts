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

export class InputValidatorGyro extends InputValidatorBase {
    validateCreatePool(input: CreatePoolGyroECLPInput) {
        super.validateCreatePool(input);

        const { eclpParams, derivedEclpParams } = input;

        GyroECLPMath.validateParams(eclpParams);
        GyroECLPMath.validateDerivedParams(eclpParams, derivedEclpParams);
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
