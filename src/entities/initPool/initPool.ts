import { PoolType } from '../../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { PoolStateInput } from '../types';
import { getSortedTokens } from '../utils';
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

    buildCall(
        input: InitPoolInput,
        poolState: PoolStateInput,
    ): InitPoolBuildOutput {
        this.inputValidator.validateAddLiquidity(input, poolState);
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const mappedPoolState = {
            ...poolState,
            tokens: sortedTokens,
        };
        return this.getInitPool(poolState.type).buildCall(
            input,
            mappedPoolState,
        );
    }
}
