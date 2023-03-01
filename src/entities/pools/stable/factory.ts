import { BasePool, BasePoolFactory } from '../';
import { StablePool } from './';
import { RawComposableStablePool, RawPool } from '../../../data/types';

export class StablePoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === 'ComposableStable';
    }

    public create(chainId: number, pool: RawPool): BasePool {
        return StablePool.fromRawPool(chainId, pool as RawComposableStablePool);
    }
}
