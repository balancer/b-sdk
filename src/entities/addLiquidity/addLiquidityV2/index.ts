import { buildCallWithPermit2ProtocolVersionError } from '@/utils';
import {
    AddLiquidityBase,
    AddLiquidityBuildCallOutput,
    AddLiquidityConfig,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    PoolState,
} from '../..';
import { PoolType } from '../../../types';
import { AddLiquidityComposableStable } from './composableStable/addLiquidityComposableStable';
import { AddLiquidityStable } from './stable/addLiquidityStable';
import { AddLiquidityV2BuildCallInput } from './types';
import { AddLiquidityWeighted } from './weighted/addLiquidityWeighted';

export class AddLiquidityV2 implements AddLiquidityBase {
    private readonly addLiquidityTypes: Record<string, AddLiquidityBase> = {};

    constructor(config?: AddLiquidityConfig) {
        const { customAddLiquidityTypes } = config || {};
        this.addLiquidityTypes = {
            //GYRO2, GYRO3, GYROE pool types only support Add Liquidity Proportional (3 - ALL_TOKENS_IN_FOR_BPT_OUT)
            [PoolType.ComposableStable]: new AddLiquidityComposableStable(),
            [PoolType.Gyro2]: new AddLiquidityWeighted(),
            [PoolType.Gyro3]: new AddLiquidityWeighted(),
            [PoolType.GyroE]: new AddLiquidityWeighted(),
            [PoolType.MetaStable]: new AddLiquidityStable(),
            [PoolType.Stable]: new AddLiquidityStable(),
            [PoolType.Weighted]: new AddLiquidityWeighted(),
            // custom add liquidity types take precedence over base types
            ...customAddLiquidityTypes,
        };
    }

    public getAddLiquidity(poolType: string): AddLiquidityBase {
        if (!this.addLiquidityTypes[poolType]) {
            throw new Error(`Unsupported pool type ${poolType}`);
        }
        return this.addLiquidityTypes[poolType];
    }

    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput> {
        return this.getAddLiquidity(poolState.type).query(input, poolState);
    }

    public buildCall(
        input: AddLiquidityV2BuildCallInput,
    ): AddLiquidityBuildCallOutput {
        return this.getAddLiquidity(input.poolType).buildCall(input);
    }

    public buildCallWithPermit2(): AddLiquidityBuildCallOutput {
        throw buildCallWithPermit2ProtocolVersionError();
    }
}
