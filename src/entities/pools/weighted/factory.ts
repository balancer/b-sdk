import { BasePool, BasePoolFactory } from '@/entities/pools';
import { WeightedPool } from './';
import { RawPool, RawWeightedPool } from '@/data/types';

export class WeightedPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === 'Weighted';
    }

    public create(pool: RawPool): BasePool {
        return WeightedPool.fromRawPool(pool as RawWeightedPool);
    }
}
