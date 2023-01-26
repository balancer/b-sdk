import { BasePool, BasePoolFactory } from '@/entities/pools';
import { PoolType } from '@/types';
import { StablePool } from './';
import { RawPool } from '@/data/types';

export class StablePoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === PoolType.ComposableStable;
    }

    public create(pool: RawPool): BasePool {
        return StablePool.fromRawPool(pool);
    }
}
