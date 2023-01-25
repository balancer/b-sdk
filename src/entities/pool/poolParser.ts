import { BasePool, BasePoolFactory } from './index';
import { WeightedPoolFactory } from './weightedFactory';
import { StablePoolFactory } from './stableFactory';
import { RawPool } from '../../poolData/types';

export class PoolParser {
    private readonly poolFactories: BasePoolFactory[];

    constructor(customPoolFactories: BasePoolFactory[]) {
        this.poolFactories = [
            // custom pool factories take precedence over base factories
            ...customPoolFactories,
            new WeightedPoolFactory(),
            new StablePoolFactory(),
        ];
    }

    public parseRawPools(rawPools: RawPool[]): BasePool[] {
        const pools: BasePool[] = [];

        for (const rawPool of rawPools) {
            for (const factory of this.poolFactories) {
                if (factory.isPoolForFactory(rawPool)) {
                    pools.push(factory.create(rawPool));
                    break;
                }
            }
        }

        return pools;
    }
}
