import {
    PoolState,
    RemoveLiquidityBase,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityCall,
    RemoveLiquidityConfig,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
} from '@/entities';
import { RemoveLiquidityWeighted } from './weighted/removeLiquidityWeighted';
import { RemoveLiquidityComposableStable } from './composableStable/removeLiquidityComposableStable';
import { PoolType } from '@/types';

export class RemoveLiquidityV2 implements RemoveLiquidityBase {
    private readonly removeLiquidityTypes: Record<string, RemoveLiquidityBase> =
        {};

    constructor(config?: RemoveLiquidityConfig) {
        const { customRemoveLiquidityTypes } = config || {};
        this.removeLiquidityTypes = {
            //GYRO2, GYRO3, GYROE only support Remove Liquidity Proportional(1 - EXACT_BPT_IN_FOR_TOKENS_OUT)
            [PoolType.Gyro2]: new RemoveLiquidityWeighted(),
            [PoolType.Gyro3]: new RemoveLiquidityWeighted(),
            [PoolType.GyroE]: new RemoveLiquidityWeighted(),
            [PoolType.Weighted]: new RemoveLiquidityWeighted(),
            [PoolType.ComposableStable]: new RemoveLiquidityComposableStable(),
            // custom remove liquidity types take precedence over base types
            ...customRemoveLiquidityTypes,
        };
    }

    public getRemoveLiquidity(poolType: string): RemoveLiquidityBase {
        if (!this.removeLiquidityTypes[poolType]) {
            throw new Error(`Unsupported pool type ${poolType}`);
        }

        return this.removeLiquidityTypes[poolType];
    }

    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        return this.getRemoveLiquidity(poolState.type).query(input, poolState);
    }

    public buildCall(input: RemoveLiquidityCall): RemoveLiquidityBuildOutput {
        return this.getRemoveLiquidity(input.poolType).buildCall(input);
    }
}
