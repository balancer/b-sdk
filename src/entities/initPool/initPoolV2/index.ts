import { PoolState } from '@/entities/types';
import { PoolType } from '@/types';
import { poolTypeProtocolVersionError } from '@/utils';

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
            ...customAddLiquidityInitTypes,
        };
    }

    getInitPool(poolType: string): InitPoolBase {
        if (!this.initPoolTypes[poolType]) {
            throw poolTypeProtocolVersionError('Init Pool', poolType, 2);
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
