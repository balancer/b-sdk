import {
    BaseJoin,
    JoinBuildOutput,
    JoinConfig,
    AddLiquidityInput,
    AddLiquidityQueryResult,
    JoinCall,
} from './types';
import { WeightedJoin } from './weighted/weightedJoin';
import { PoolStateInput } from '../types';
import { validateInputs } from './utils/validateInputs';
import { getSortedTokens } from '../utils/getSortedTokens';
import { ComposableStableJoin } from './composable-stable/composableStableJoin';

export class PoolJoin {
    private readonly poolJoins: Record<string, BaseJoin> = {};

    constructor(config?: JoinConfig) {
        const { customPoolJoins } = config || {};
        this.poolJoins = {
            WEIGHTED: new WeightedJoin(),
            // PHANTOM_STABLE === ComposableStables in API
            PHANTOM_STABLE: new ComposableStableJoin(),
            // custom pool Joins take precedence over base Joins
            ...customPoolJoins,
        };
    }

    public getJoin(poolType: string): BaseJoin {
        if (!this.poolJoins[poolType]) {
            throw new Error('Unsupported pool type');
        }

        return this.poolJoins[poolType];
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

        return this.getJoin(poolState.type).query(input, mappedPoolState);
    }

    public buildCall(input: JoinCall): JoinBuildOutput {
        return this.getJoin(input.poolType).buildCall(input);
    }
}
