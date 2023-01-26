import { BasePool, BasePoolFactory } from './index';
import { WeightedPoolFactory } from './weightedFactory';
import { StablePoolFactory } from './stableFactory';
import { LinearPoolFactory } from './linearFactory';
import { AaveReserve, SubgraphPool } from '../../poolProvider';

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

    public parseRawPools(rawPools: SubgraphPool[], rawRates: AaveReserve[]): BasePool[] {
        const pools: BasePool[] = [];

        for (const rawPool of rawPools) {
            for (const factory of this.poolFactories) {
                if (factory.isPoolForFactory(rawPool)) {
                    if (factory instanceof LinearPoolFactory) {
                        pools.push(factory.create(rawPool, rawRates));
                    } else {
                        pools.push(factory.create(rawPool));
                    }
                    break;
                }
            }
        }

        return pools;
    }
}
