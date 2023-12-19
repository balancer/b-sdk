import { PoolType } from '../../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { PoolState } from '../types';
import { InitPoolComposableStable } from './composableStable/initPoolComposableStable';
import {
    InitPoolBase,
    InitPoolBuildOutput,
    InitPoolConfig,
    InitPoolInput,
} from './types';
import { InitPoolWeighted } from './weighted/initPoolWeighted';

export class InitPool {
    initPoolTypes: Record<string, InitPoolBase> = {};

    inputValidator: InputValidator = new InputValidator();

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

    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput {
        this.inputValidator.validateAddLiquidity(input, poolState);
        return this.getInitPool(poolState.type).buildCall(input, poolState);
    }
}
