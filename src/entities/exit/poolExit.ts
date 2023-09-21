import {
    BaseExit,
    BuildOutput,
    ExitCallInput,
    ExitConfig,
    ExitInput,
    ExitQueryResult,
} from './types';
import { WeightedExit } from './weighted/weightedExit';
import { PoolStateInput } from '../types';
import { validateInputs } from './weighted/validateInputs';
import { getSortedTokens } from '../utils';

export class PoolExit {
    private readonly poolExits: Record<string, BaseExit> = {};

    constructor(config?: ExitConfig) {
        const { customPoolExits } = config || {};
        this.poolExits = {
            Weighted: new WeightedExit(),
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
        poolType: string,
        input: ExitInput,
        poolState: PoolStateInput,
    ): Promise<ExitQueryResult> {
        validateInputs(input, poolState);

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const mappedPoolState = {
            ...poolState,
            tokens: sortedTokens,
        };

        return this.getExit(poolType).query(input, mappedPoolState);
    }

    public buildCall(poolType: string, input: ExitCallInput): BuildOutput {
        return this.getExit(poolType).buildCall(input);
    }
}
