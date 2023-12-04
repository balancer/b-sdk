import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityConfig,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    AddLiquidityCall,
    AddLiquidityInitInput,
} from './types';
import { AddLiquidityWeighted } from './weighted/addLiquidityWeighted';
import { PoolStateInput } from '../types';
import { validateInputs } from './utils/validateInputs';
import { getSortedTokens } from '../utils/getSortedTokens';
import { AddLiquidityComposableStable } from './composable-stable/addLiquidityComposableStable';

export class AddLiquidity {
    private readonly addLiquidityTypes: Record<string, AddLiquidityBase> = {};

    constructor(config?: AddLiquidityConfig) {
        const { customAddLiquidityTypes } = config || {};
        this.addLiquidityTypes = {
            //GYRO2, GYRO3, GYROE pool types only support Add Liquidity Proportional (3 - ALL_TOKENS_IN_FOR_BPT_OUT)
            GYRO2: new AddLiquidityWeighted(),
            GYRO3: new AddLiquidityWeighted(),
            GYROE: new AddLiquidityWeighted(),
            WEIGHTED: new AddLiquidityWeighted(),
            // PHANTOM_STABLE === ComposableStables in API
            PHANTOM_STABLE: new AddLiquidityComposableStable(),
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
        poolState: PoolStateInput,
    ): Promise<AddLiquidityQueryOutput> {
        validateInputs(input, poolState);

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const mappedPoolState = {
            ...poolState,
            tokens: sortedTokens,
        };

        return this.getAddLiquidity(poolState.type).query(
            input,
            mappedPoolState,
        );
    }

    public buildCall(input: AddLiquidityCall): AddLiquidityBuildOutput {
        return this.getAddLiquidity(input.poolType).buildCall(input);
    }

    public buildInitCall(
        input: AddLiquidityInitInput,
        poolState: PoolStateInput,
    ): AddLiquidityBuildOutput {
        validateInputs(input, poolState);

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const mappedPoolState = {
            ...poolState,
            tokens: sortedTokens,
        };
        return this.getAddLiquidity(poolState.type).buildInitCall(
            input,
            mappedPoolState,
        );
    }
}
