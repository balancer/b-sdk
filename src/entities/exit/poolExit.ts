import {
    BaseExit,
    ExitBuildOutput,
    ExitCall,
    ExitConfig,
    ExitInput,
    ExitQueryResult,
} from './types';
import { WeightedExit } from './weighted/weightedExit';
import { PoolStateInput } from '../types';
import { validateInputs } from './weighted/validateInputs';
import { getSortedTokens } from '../utils/getSortedTokens';
import { ComposableStableExit } from './composable-stable/composableStableExit';

export class PoolExit {
    private readonly poolExits: Record<string, BaseExit> = {};

    constructor(config?: ExitConfig) {
        const { customPoolExits } = config || {};
        this.poolExits = {
            Weighted: new WeightedExit(),
            // PHANTOM_STABLE === ComposableStables in API
            PHANTOM_STABLE: new ComposableStableExit(),
            // custom pool Exits take precedence over base Exits
            ...customPoolExits,
        };
    }

    public getExit(poolType: string): BaseExit {
        if (!this.poolExits[poolType]) {
            throw new Error('Unsupported pool type');
        }

        return this.poolExits[poolType];
    }

    public async query(
        input: ExitInput,
        poolState: PoolStateInput,
    ): Promise<ExitQueryResult> {
        validateInputs(input, poolState);

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const mappedPoolState = {
            ...poolState,
            tokens: sortedTokens,
        };

        return this.getExit(poolState.type).query(input, mappedPoolState);
    }

    public buildCall(input: ExitCall): ExitBuildOutput {
        return this.getExit(input.poolType).buildCall(input);
    }
}
