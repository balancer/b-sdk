import { GyroEPool } from '.';
import { BasePool, BasePoolFactory } from '..';
import { RawGyroEPool, RawPool } from '../../../data/types';

export class GyroEPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType.includes('GyroE');
    }

    public create(chainId: number, pool: RawPool): BasePool {
        return GyroEPool.fromRawPool(chainId, pool as RawGyroEPool);
    }
}
