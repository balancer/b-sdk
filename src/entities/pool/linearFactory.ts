import { BasePool, BasePoolFactory } from './';
import { AaveReserve, SubgraphPool } from '../../poolProvider';
import { PoolType } from '../../types';
import { LinearPool } from './linear';

export class LinearPoolFactory implements BasePoolFactory {
    public isPoolForFactory(pool: SubgraphPool): boolean {
        return pool.poolType === PoolType.AaveLinear;
    }

    public create(pool: SubgraphPool, rates: AaveReserve[]): BasePool {
        return LinearPool.fromRawPool(pool, rates);
    }
}