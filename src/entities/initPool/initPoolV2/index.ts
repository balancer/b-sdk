import { PoolState } from '@/entities/types';
import { PoolType } from '@/types';

import { InitPoolComposableStable } from './composableStable/initPoolComposableStable';
import {
    InitPoolBase,
    InitPoolBuildOutput,
    InitPoolConfig,
    InitPoolInputV2,
} from '../types';
import { InitPoolWeighted } from './weighted/initPoolWeighted';

export class InitPoolV2 implements InitPoolBase {
    initPoolTypes: Record<string, InitPoolBase> = {};

    constructor(config?: InitPoolConfig) {
        const { initPoolTypes: customAddLiquidityInitTypes } = config || {};
        this.initPoolTypes = {
            [PoolType.Weighted]: new InitPoolWeighted(),
            [PoolType.ComposableStable]: new InitPoolComposableStable(),
            ...customAddLiquidityInitTypes,
        };
    }

    getInitPool(poolType: string): InitPoolBase {
        if (!this.initPoolTypes[poolType]) {
            throw new Error('Unsupported pool type: ${poolType}');
        }
        return this.initPoolTypes[poolType];
    }

    buildCall(
        input: InitPoolInputV2,
        poolState: PoolState,
    ): InitPoolBuildOutput {
        return this.getInitPool(poolState.type).buildCall(input, poolState);
    }
}
