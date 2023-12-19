import { MinimalToken } from '../data';
import { Address, Hex } from '../types';

// Returned from API and used as input
export type PoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: MinimalToken[];
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

export type InitPoolAmounts = {
    maxAmountsIn: bigint[];
};

export type InitPoolAmountsComposableStable = InitPoolAmounts & {
    amountsIn: bigint[];
};
