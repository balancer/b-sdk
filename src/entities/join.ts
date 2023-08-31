import { BaseJoin } from './pools';
import { WeightedJoin } from './pools/weighted';

/*********************** Basic Helper to get join class from pool type *************/
export type JoinConfig = {
    customPoolJoins: Record<string, BaseJoin>;
};

export class JoinParser {
    private readonly poolJoins: Record<string, BaseJoin> = {};

    constructor(config?: JoinConfig) {
        const { customPoolJoins } = config || {};
        this.poolJoins = {
            Weighted: new WeightedJoin(),
            // custom pool Joins take precedence over base Joins
            ...customPoolJoins,
        };
    }

    public getJoin(poolType: string): BaseJoin {
        // TODO - Need to parse
        return this.poolJoins[poolType];
    }
}
