import { Hex } from 'viem';
import { Address, PoolType, SwapKind } from '../../types';
import { JoinKind, Token, TokenAmount } from '../';
import { RawPool } from '../../data/types';
import { Slippage } from '../slippage';

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
    id: Address;
    address: Address;
    type: string;
    // TODO: is it ok to replace by Token here? Or should we stick to basic types?
    tokens: {
        address: Address;
        decimals: number;
    }[]; // already properly sorted in case different versions sort them differently
};

// This will be extended for each pools specific input requirements
export type BaseJoinInput = {
    chainId: number;
    rpcUrl?: string;
};

export type InitJoinInput = BaseJoinInput & {
    initAmountsIn: TokenAmount[];
    kind: JoinKind.Init;
};

export type ProportionalJoinInput = BaseJoinInput & {
    refAmountIn: TokenAmount;
    kind: JoinKind.Proportional;
};

export type UnbalancedJoinInput = BaseJoinInput & {
    amountsIn: TokenAmount[];
    kind: JoinKind.Unbalanced;
};

export type SingleAssetJoinInput = BaseJoinInput & {
    amountIn: TokenAmount;
    kind: JoinKind.SingleAsset;
};

export type ExactOutJoinInput = BaseJoinInput & {
    bptOut: TokenAmount;
    kind: JoinKind.ExactOut;
};

export type JoinInput =
    | InitJoinInput
    | ProportionalJoinInput
    | UnbalancedJoinInput
    | SingleAssetJoinInput
    | ExactOutJoinInput;

// Returned from a join query
export type JoinQueryResult = {
    id: Address;
    assets: Address[];
    joinKind: JoinKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
};

export type JoinCallInput = JoinQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export interface BaseJoin {
    getInstance(): BaseJoin;
    query(input: JoinInput, poolState: PoolState): Promise<JoinQueryResult>;
    buildCall(input: JoinCallInput): {
        call: Address;
        to: Address;
        value: bigint;
        minBptOut: bigint;
    };
}
