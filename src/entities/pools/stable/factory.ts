import { BasePool, BasePoolFactory } from '@/entities/pools';
import { StablePool } from './';
import { RawComposableStablePool, RawPool } from '@/data/types';

export class StablePoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === 'ComposableStable';
    }

    public create(pool: RawPool): BasePool {
        return StablePool.fromRawPool(pool as RawComposableStablePool);
    }
}
