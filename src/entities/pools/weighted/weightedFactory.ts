import { BasePool, BasePoolFactory } from '../index';
import { WeightedPool } from './weightedPool';
import { RawPool, RawWeightedPool } from '../../../data/types';

export class WeightedPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === 'Weighted';
    }

    public create(chainId: number, pool: RawPool): BasePool {
        return WeightedPool.fromRawPool(chainId, pool as RawWeightedPool);
    }
}
