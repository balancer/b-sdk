import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityCall,
    RemoveLiquidityConfig,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
} from './types';
import { RemoveLiquidityWeighted } from './weighted/removeLiquidityWeighted';
import { PoolStateInput } from '../types';
import { validateInputs } from './utils/validateInputs';
import { getSortedTokens } from '../utils/getSortedTokens';
import { RemoveLiquidityComposableStable } from './composable-stable/removeLiquidityComposableStable';

export class RemoveLiquidity {
    private readonly removeLiquidityTypes: Record<string, RemoveLiquidityBase> =
        {};

    constructor(config?: RemoveLiquidityConfig) {
        const { customRemoveLiquidityTypes } = config || {};
        this.removeLiquidityTypes = {
            //GYRO2, GYRO3, GYROE only support Remove Liquidity Proportional(1 - EXACT_BPT_IN_FOR_TOKENS_OUT)
            GYRO2: new RemoveLiquidityWeighted(),
            GYRO3: new RemoveLiquidityWeighted(),
            GYROE: new RemoveLiquidityWeighted(),
            WEIGHTED: new RemoveLiquidityWeighted(),
            // PHANTOM_STABLE === ComposableStables in API
            PHANTOM_STABLE: new RemoveLiquidityComposableStable(),
            // custom remove liquidity types take precedence over base types
            ...customRemoveLiquidityTypes,
        };
    }

    public getRemoveLiquidity(poolType: string): RemoveLiquidityBase {
        if (!this.removeLiquidityTypes[poolType]) {
            throw new Error('Unsupported pool type');
        }

        return this.removeLiquidityTypes[poolType];
    }

    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolStateInput,
    ): Promise<RemoveLiquidityQueryOutput> {
        validateInputs(input, poolState);

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const mappedPoolState = {
            ...poolState,
            tokens: sortedTokens,
        };

        return this.getRemoveLiquidity(poolState.type).query(
            input,
            mappedPoolState,
        );
    }

    public buildCall(input: RemoveLiquidityCall): RemoveLiquidityBuildOutput {
        return this.getRemoveLiquidity(input.poolType).buildCall(input);
    }
}
