import { BasePool, BasePoolFactory } from './';
import { WeightedPoolFactory } from './weighted';
import { StablePoolFactory } from './stable';
import { MetaStablePoolFactory } from './metastable';
import { LinearPoolFactory } from './linear';
import { RawPool } from '../../data/types';

export class PoolParser {
    private readonly poolFactories: BasePoolFactory[];
    private readonly chainId: number;
    constructor(chainId: number, customPoolFactories: BasePoolFactory[]) {
        this.chainId = chainId;
        this.poolFactories = [
            // custom pool factories take precedence over base factories
            ...customPoolFactories,
            new WeightedPoolFactory(),
            new StablePoolFactory(),
            new MetaStablePoolFactory(),
            new LinearPoolFactory(),
        ];
    }

    public parseRawPools(rawPools: RawPool[]): BasePool[] {
        const pools: BasePool[] = [];

        for (const rawPool of rawPools) {
            for (const factory of this.poolFactories) {
                if (factory.isPoolForFactory(rawPool)) {
                    pools.push(factory.create(this.chainId, rawPool));

                    break;
                }
            }
        }

        return pools;
    }
}
