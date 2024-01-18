import { MinimalToken } from '../data';
import { Address, Hex, PoolType } from '../types';

// Returned from API and used as input
export type PoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: MinimalToken[];
    balancerVersion: 2 | 3;
};

export type AddLiquidityAmounts = {
    maxAmountsIn: bigint[];
    tokenInIndex: number | undefined;
    minimumBpt: bigint;
};

export type RemoveLiquidityAmounts = {
    minAmountsOut: bigint[];
    tokenOutIndex: number | undefined;
    maxBptAmountIn: bigint;
};

export type NestedPool = {
    id: Hex;
    address: Address;
    type: PoolType;
    level: number; // 0 is the bottom and the highest level is the top
    tokens: MinimalToken[]; // each token should have at least one
};

export type NestedPoolState = {
    pools: NestedPool[];
    mainTokens: {
        address: Address;
        decimals: number;
    }[];
};

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
