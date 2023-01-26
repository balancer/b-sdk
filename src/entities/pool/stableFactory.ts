import { BasePool, BasePoolFactory } from './';
import { PoolType } from '../../types';
import { StablePool } from './stable';
import { RawPool } from '../../poolData/types';

export class StablePoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === PoolType.ComposableStable;
    }

    public create(pool: RawPool): BasePool {
        return StablePool.fromRawPool(pool);
    }
}
