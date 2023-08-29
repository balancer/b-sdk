import { BaseJoin } from './pools';
import { JoinWeighted } from './pools/weighted';

/*********************** Basic Helper to get join class from pool type *************/
export type JoinConfig = {
    customPoolFactories: Record<string, BaseJoin>;
};

export class JoinHelper {
    private readonly poolFactories: Record<string, BaseJoin> = {};

    constructor(config?: JoinConfig) {
        const { customPoolFactories } = config || {};
        this.poolFactories = {
            weighted: new JoinWeighted(),
            // custom pool factories take precedence over base factories
            ...customPoolFactories,
        };
    }

    public getJoin(poolType: string): BaseJoin {
        // TODO - Need to parse
        return this.poolFactories[poolType];
    }
}
