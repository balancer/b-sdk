import { BasePool, BasePoolFactory } from './';
import { LinearPool } from './linear';
import { RawPool } from '../../poolData/types';

export class LinearPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: RawPool): boolean {
        return pool.poolType.includes('Linear');
    }

    public create(pool: RawPool): BasePool {
        return LinearPool.fromRawPool(pool);
    }
}
