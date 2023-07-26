import { Gyro3Pool } from '.';
import { BasePool, BasePoolFactory } from '..';
import { RawGyro3Pool, RawPool } from '../../../data/types';

export class Gyro3PoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType.includes('Gyro3');
    }

    public create(chainId: number, pool: RawPool): BasePool {
        return Gyro3Pool.fromRawPool(chainId, pool as RawGyro3Pool);
    }
}
