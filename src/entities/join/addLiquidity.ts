import {
    AddLiquidityBase,
    JoinBuildOutput,
    AddLiquidityConfig,
    AddLiquidityInput,
    AddLiquidityQueryResult,
    AddLiquidityCall,
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
            WEIGHTED: new AddLiquidityWeighted(),
            // PHANTOM_STABLE === ComposableStables in API
            PHANTOM_STABLE: new AddLiquidityComposableStable(),
            // custom pool Joins take precedence over base Joins
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
    ): Promise<AddLiquidityQueryResult> {
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

    public buildCall(input: AddLiquidityCall): JoinBuildOutput {
        return this.getAddLiquidity(input.poolType).buildCall(input);
    }
}
