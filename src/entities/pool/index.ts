import { PoolType } from '../../types';
import { Token, TokenAmount } from '../';
import { AaveReserve, SubgraphPool } from '../../poolProvider';

export interface BasePool {
    poolType: PoolType | string;
    id: string;
    address: string;
    swapFee: bigint;
    tokens: TokenAmount[];
    getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint;
    swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount;
}

export interface BasePoolFactory {
    isPoolForFactory(pool: SubgraphPool): boolean;
    create(pool: SubgraphPool, rates?: AaveReserve[]): BasePool;
}
