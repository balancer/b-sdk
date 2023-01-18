import { BasePool, BasePoolFactory } from './';
import { SubgraphPool } from '../../poolProvider';
import { PoolType } from '../../types';
import { WeightedPool } from './weighted';

export class WeightedPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: SubgraphPool): boolean {
        return pool.poolType === PoolType.Weighted;
    }

    public create(pool: SubgraphPool): BasePool {
        return WeightedPool.fromRawPool(pool);
    }
}
