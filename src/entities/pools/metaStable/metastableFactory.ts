import { BasePool, BasePoolFactory } from '..';
import { MetaStablePool } from '.';
import { RawMetaStablePool, RawPool } from '../../../data/types';

export class MetaStablePoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType === 'MetaStable';
    }

    public create(chainId: number, pool: RawPool): BasePool {
        return MetaStablePool.fromRawPool(chainId, pool as RawMetaStablePool);
    }
}
