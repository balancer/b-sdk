import { BasePool, BasePoolFactory } from './';
import { SubgraphPool } from '../../poolProvider';
import { PoolType } from '../../types';
import { StablePool } from './stable';

export class StablePoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: SubgraphPool): boolean {
        return pool.poolType === PoolType.ComposableStable;
    }

    public create(pool: SubgraphPool): BasePool {
        return StablePool.fromRawPool(pool);
    }
}
