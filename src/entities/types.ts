import { HumanAmount, MinimalToken, PoolTokenWithBalance } from '../data';
import { Address, Hex, PoolType } from '../types';

// Returned from API and used as input
export type PoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: MinimalToken[];
    protocolVersion: 1 | 2 | 3;
};

export type PoolStateWithBalances = {
    id: Hex;
    address: Address;
    type: string;
    tokens: PoolTokenWithBalance[];
    totalShares: HumanAmount;
    protocolVersion: 1 | 2 | 3;
};

export type PoolTokenWithUnderlying = MinimalToken & {
    underlyingToken: MinimalToken | null;
};

export interface PoolTokenWithUnderlyingBalance extends PoolTokenWithBalance {
    underlyingToken: PoolTokenWithBalance | null;
}

export type PoolStateWithUnderlyings = {
    id: Hex;
    address: Address;
    type: string;
    tokens: PoolTokenWithUnderlying[];
    protocolVersion: 1 | 2 | 3;
};

export type PoolStateWithUnderlyingBalances = {
    id: Hex;
    address: Address;
    type: string;
    tokens: PoolTokenWithUnderlyingBalance[];
    totalShares: HumanAmount;
    protocolVersion: 1 | 2 | 3;
};

export type AddLiquidityAmounts = {
    maxAmountsIn: bigint[];
    maxAmountsInWithoutBpt: bigint[];
    tokenInIndex: number | undefined;
    minimumBpt: bigint;
};

export type RemoveLiquidityAmounts = {
    minAmountsOut: bigint[];
    tokenOutIndex: number | undefined;
    maxBptAmountIn: bigint;
};

type NestedPoolBase = {
    id: Hex;
    address: Address;
    type: PoolType;
    level: number; // 0 is the bottom and the highest level is the top
};

export type NestedPoolV2 = NestedPoolBase & {
    tokens: MinimalToken[]; // each token should have at least one
};

export type NestedPoolV3 = NestedPoolBase & {
    tokens: PoolTokenWithUnderlying[]; // each token should have at least one
};

type NestedPoolStateBase = {
    protocolVersion: 1 | 2 | 3;
    mainTokens: {
        address: Address;
        decimals: number;
    }[];
};

export type NestedPoolStateV2 = NestedPoolStateBase & {
    protocolVersion: 1 | 2;
    pools: NestedPoolV2[];
};

export type NestedPoolStateV3 = NestedPoolStateBase & {
    protocolVersion: 3;
    pools: NestedPoolV3[];
};

export type NestedPoolState = NestedPoolStateV2 | NestedPoolStateV3;

export enum PoolKind {
    WEIGHTED = 0,
    LEGACY_STABLE = 1,
    COMPOSABLE_STABLE = 2,
    COMPOSABLE_STABLE_V2 = 3,
    // (note only Weighted and COMPOSABLE_STABLE_V2 will support proportional exits)
}
export type InitPoolAmounts = {
    maxAmountsIn: bigint[];
};

export type InitPoolAmountsComposableStable = InitPoolAmounts & {
    amountsIn: bigint[];
};
