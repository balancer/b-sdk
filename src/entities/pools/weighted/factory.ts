import { BasePool, BasePoolFactory } from '@/entities/pools';
import { PoolType } from '@/types';
import { WeightedPool } from './';
import { RawPool } from '@/data/types';

export class WeightedPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === PoolType.Weighted;
    }

    public create(pool: RawPool): BasePool {
        return WeightedPool.fromRawPool(pool);
    }
}
