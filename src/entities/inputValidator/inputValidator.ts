import { PoolType } from '../../types';
import { AddLiquidityInput } from '../addLiquidity';
import { CreatePoolInput } from '../createPool/types';
import { InitPoolInput } from '../initPool/types';
import { PoolStateInput } from '../types';
import { InputValidatorComposableStable } from './composableStable/inputValidatorComposableStable';
import { InputValidatorGyro } from './gyro/inputValidatorGyro';
import { InputValidatorBase } from './types';
import { InputValidatorWeighted } from './weighted/inputValidatorWeighted';

export class InputValidator {
    validators: Record<string, InputValidatorBase> = {};

    constructor() {
        this.validators = {
            [PoolType.Weighted]: new InputValidatorWeighted(),
            [PoolType.Gyro2]: new InputValidatorGyro(),
            [PoolType.Gyro3]: new InputValidatorGyro(),
            [PoolType.GyroE]: new InputValidatorGyro(),
            [PoolType.ComposableStable]: new InputValidatorComposableStable(),
        };
    }

    getValidator(poolType: string): InputValidatorBase {
        if (!this.validators[poolType])
            throw new Error('This Pool type does not have a validator');
        return this.validators[poolType];
    }

    validateAddLiquidity(
        addLiquidityInput: AddLiquidityInput | InitPoolInput,
        poolState: PoolStateInput,
    ): void {
        this.getValidator(poolState.type).validateAddLiquidity(
            addLiquidityInput,
            poolState,
        );
    }

    validateRemoveLiquidity(removeLiquidityInput: any, poolState: any): void {
        this.getValidator(poolState.type).validateRemoveLiquidity(
            removeLiquidityInput,
            poolState,
        );
    }

    validateCreatePool(poolType: string, input: CreatePoolInput): void {
        this.getValidator(poolType).validateCreatePool(input);
    }
}
