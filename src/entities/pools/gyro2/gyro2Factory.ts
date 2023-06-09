import { BasePool, BasePoolFactory } from '..';
import { Gyro2Pool } from '.';
import { RawGyro2Pool, RawPool } from '../../../data/types';

export class Gyro2PoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType.includes('Gyro2');
    }

    public create(chainId: number, pool: RawPool): BasePool {
        return Gyro2Pool.fromRawPool(chainId, pool as RawGyro2Pool);
    }
}
