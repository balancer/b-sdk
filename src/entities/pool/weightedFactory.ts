import { BasePool, BasePoolFactory } from './';
import { PoolType } from '../../types';
import { WeightedPool } from './weighted';
import { RawPool } from '../../poolData/types';

export class WeightedPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === PoolType.Weighted;
    }

    public create(pool: RawPool): BasePool {
        return WeightedPool.fromRawPool(pool);
    }
}
