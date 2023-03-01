import { BasePool, BasePoolFactory } from '../';
import { WeightedPool } from './';
import { RawPool, RawWeightedPool } from '../../../data/types';

export class WeightedPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === 'Weighted';
    }

    public create(chainId: number, pool: RawPool): BasePool {
        return WeightedPool.fromRawPool(chainId, pool as RawWeightedPool);
    }
}
