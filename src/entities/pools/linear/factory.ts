import { BasePool, BasePoolFactory } from '../';
import { LinearPool } from './';
import { RawLinearPool, RawPool } from '../../../data/types';

export class LinearPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType.includes('Linear');
    }

    public create(pool: RawPool): BasePool {
        return LinearPool.fromRawPool(pool as RawLinearPool);
    }
}
