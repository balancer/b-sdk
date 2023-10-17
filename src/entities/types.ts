import { MinimalToken } from '../data';
import { Address, Hex } from '../types';
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

export type AmountsJoin = {
    maxAmountsIn: bigint[];
    tokenInIndex: number | undefined;
    minimumBpt: bigint;
};

export type AmountsExit = {
    minAmountsOut: bigint[];
    tokenOutIndex: number | undefined;
    maxBptAmountIn: bigint;
};
export type NestedPool = {
    id: Hex;
    address: Address;
    type: string;
    level: number; // 0 is the bottom and the highest level is the top
    tokens: MinimalToken[]; // each token should have at least one
};

export type NestedPoolState = {
    pools: NestedPool[];
};
