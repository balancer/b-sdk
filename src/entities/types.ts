import { MinimalToken } from '../data';
import { Address, Hex, PoolType } from '../types';
import { Token } from './token';

// Returned from API and used as input
export type PoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: Token[];
};

export type PoolStateInput = {
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
