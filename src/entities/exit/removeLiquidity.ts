import {
    RemoveLiquidityBase,
    ExitBuildOutput,
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
            WEIGHTED: new RemoveLiquidityWeighted(),
            // PHANTOM_STABLE === ComposableStables in API
            PHANTOM_STABLE: new RemoveLiquidityComposableStable(),
            // custom pool Exits take precedence over base Exits
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

    public buildCall(input: RemoveLiquidityCall): ExitBuildOutput {
        return this.getRemoveLiquidity(input.poolType).buildCall(input);
    }
}
