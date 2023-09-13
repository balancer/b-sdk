import { BaseExit, ExitConfig } from './types';
import { WeightedExit } from './weighted/weightedExit';

/*********************** Basic Helper to get exit class from pool type *************/

export class ExitParser {
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
        return this.poolExits[poolType];
    }
}
