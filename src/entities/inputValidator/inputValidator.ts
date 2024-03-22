import { PoolType } from '../../types';
import { AddLiquidityInput } from '../addLiquidity/types';
import { CreatePoolInput } from '../createPool/types';
import { InitPoolInput } from '../initPool/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityRecoveryInput,
} from '../removeLiquidity/types';
import { PoolState } from '../types';
import { InputValidatorComposableStable } from './composableStable/inputValidatorComposableStable';
import { InputValidatorGyro } from './gyro/inputValidatorGyro';
import { InputValidatorStable } from './stable/inputValidatorStable';
import { InputValidatorBase } from './types';
import { InputValidatorWeighted } from './weighted/inputValidatorWeighted';

export class InputValidator {
    validators: Record<string, InputValidatorBase> = {};

    constructor() {
        this.validators = {
            [PoolType.ComposableStable]: new InputValidatorComposableStable(),
            [PoolType.Gyro2]: new InputValidatorGyro(),
            [PoolType.Gyro3]: new InputValidatorGyro(),
            [PoolType.GyroE]: new InputValidatorGyro(),
            [PoolType.MetaStable]: new InputValidatorStable(),
            [PoolType.Stable]: new InputValidatorStable(),
            [PoolType.Weighted]: new InputValidatorWeighted(),
        };
    }

    getValidator(poolType: string): InputValidatorBase {
        if (!this.validators[poolType])
            throw new Error(`Pool type ${poolType} does not have a validator`);
        return this.validators[poolType];
    }

    validateInitPool(initPoolInput: InitPoolInput, poolState: PoolState) {
        this.getValidator(poolState.type).validateInitPool(
            initPoolInput,
            poolState,
        );
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput,
        poolState: PoolState,
    ): void {
        this.getValidator(poolState.type).validateAddLiquidity(
            addLiquidityInput,
            poolState,
        );
    }

    validateRemoveLiquidity(
        removeLiquidityInput: RemoveLiquidityInput,
        poolState: PoolState,
    ): void {
        this.getValidator(poolState.type).validateRemoveLiquidity(
            removeLiquidityInput,
            poolState,
        );
    }

    validateRemoveLiquidityRecovery(
        removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput,
        poolState: PoolState,
    ): void {
        this.getValidator(poolState.type).validateRemoveLiquidityRecovery(
            removeLiquidityRecoveryInput,
            poolState,
        );
    }

    validateCreatePool(input: CreatePoolInput): void {
        this.getValidator(input.poolType).validateCreatePool(input);
    }
}
