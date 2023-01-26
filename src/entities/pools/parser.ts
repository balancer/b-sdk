import { BasePool, BasePoolFactory } from './';
import { WeightedPoolFactory } from './weighted/factory';
import { StablePoolFactory } from './stable/factory';
import { LinearPoolFactory } from './linear/factory';
import { RawPool } from '@/data/types';

export class PoolParser {
    private readonly poolFactories: BasePoolFactory[];

    constructor(customPoolFactories: BasePoolFactory[]) {
        this.poolFactories = [
            // custom pool factories take precedence over base factories
            ...customPoolFactories,
            new WeightedPoolFactory(),
            new StablePoolFactory(),
            new LinearPoolFactory(),
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
