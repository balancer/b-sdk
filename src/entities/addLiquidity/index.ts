import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityConfig,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    AddLiquidityCall,
} from './types';
import { AddLiquidityWeighted } from './weighted/addLiquidityWeighted';
import { PoolState } from '../types';
import { AddLiquidityComposableStable } from './composable-stable/addLiquidityComposableStable';
import { InputValidator } from '../inputValidator/inputValidator';
import { PoolType } from '../../types';

export * from './types';

export class AddLiquidity implements AddLiquidityBase {
    private readonly addLiquidityTypes: Record<string, AddLiquidityBase> = {};
    private readonly inputValidator: InputValidator = new InputValidator();

    constructor(config?: AddLiquidityConfig) {
        const { customAddLiquidityTypes } = config || {};
        this.addLiquidityTypes = {
            //GYRO2, GYRO3, GYROE pool types only support Add Liquidity Proportional (3 - ALL_TOKENS_IN_FOR_BPT_OUT)
            [PoolType.Gyro2]: new AddLiquidityWeighted(),
            [PoolType.Gyro3]: new AddLiquidityWeighted(),
            [PoolType.GyroE]: new AddLiquidityWeighted(),
            [PoolType.Weighted]: new AddLiquidityWeighted(),
            [PoolType.ComposableStable]: new AddLiquidityComposableStable(),
            // custom add liquidity types take precedence over base types
            ...customAddLiquidityTypes,
        };
    }

    public getAddLiquidity(poolType: string): AddLiquidityBase {
        if (!this.addLiquidityTypes[poolType]) {
            throw new Error('Unsupported pool type');
        }
        return this.addLiquidityTypes[poolType];
    }

    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput> {
        this.inputValidator.validateAddLiquidity(input, poolState);
        return this.getAddLiquidity(poolState.type).query(input, poolState);
    }

    public buildCall(input: AddLiquidityCall): AddLiquidityBuildOutput {
        return this.getAddLiquidity(input.poolType).buildCall(input);
    }
}
