import { InputValidator } from '../inputValidator/inputValidator';
import { PoolStateInput } from '../types';
import { getSortedTokens } from '../utils';
import {
    AddLiquidityInitBase,
    AddLiquidityInitConfig,
    AddLiquidityInitInput,
} from './types';
import { AddLiquidityInitWeighted } from './weighted/addLiquidityInitWeighted';

export class AddLiquidityInit {
    addLiquidityInitTypes: Record<string, AddLiquidityInitBase> = {};

    inputValidator: InputValidator = new InputValidator();

    constructor(config?: AddLiquidityInitConfig) {
        const { customAddLiquidityInitTypes } = config || {};
        this.addLiquidityInitTypes = {
            WEIGHTED: new AddLiquidityInitWeighted(),
            ...customAddLiquidityInitTypes,
        };
    }

    getAddLiquidityInit(poolType: string): AddLiquidityInitBase {
        if (!this.addLiquidityInitTypes[poolType]) {
            throw new Error('Unsupported pool type: ${poolType}');
        }
        return this.addLiquidityInitTypes[poolType];
    }

    buildCall(input: AddLiquidityInitInput, poolState: PoolStateInput): any {
        this.inputValidator.validateAddLiquidity(input, poolState);
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const mappedPoolState = {
            ...poolState,
            tokens: sortedTokens,
        };
        return this.getAddLiquidityInit(poolState.type).buildCall(
            input,
            mappedPoolState,
        );
    }
}
