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

// Returned from API and used as input
export type PoolState = {
    id: string;
    type: string;
    assets: string[]; // already properly sorted in case different versions sort them differently
    // TODO - Possibly add encoding info here?
};

// This will be extended for each pools specific input requirements
export type JoinInput = {
    tokenAmounts: TokenAmount[];
    chainId: number;
    rpcUrl: string;
    isInit?: boolean;
};

// Returned from a join query
export type JoinQueryResult = {
    id: string;
    assets: string[];
    joinKind: string;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
};

export interface BaseJoin {
    getInstance(): BaseJoin;
    query(input: JoinInput, poolState: PoolState): Promise<JoinQueryResult>;
    // TODO - Best way to represent slippage?
    getCall(input: JoinQueryResult & { slippage: string }): {
        call: string;
        to: string;
        value: string;
    };
}
