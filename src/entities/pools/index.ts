import { Hex } from 'viem';
import { PoolType, SwapKind } from '../../types';
import { Token, TokenAmount } from '../';
import { RawPool } from '../../data/types';

export interface BasePool {
    readonly poolType: PoolType | string;
    readonly id: Hex;
    readonly address: string;
    swapFee: bigint;
    tokens: TokenAmount[];
    getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint;
    swapGivenIn(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
        mutateBalances?: boolean,
    ): TokenAmount;
    swapGivenOut(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
        mutateBalances?: boolean,
    ): TokenAmount;
    getLimitAmountSwap(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
    ): bigint;
}

export interface BasePoolFactory {
    isPoolForFactory(pool: RawPool): boolean;
    create(chainId: number, pool: RawPool): BasePool;
}
