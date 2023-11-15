import { MinimalToken } from '../data';
import { Address, Hex } from '../types';
import { Token } from './token';

type PoolBase = {
    id: Hex;
    address: Address;
    type: string;
    balancerVersion: 2 | 3;
};

// Returned from API and used as input
export type PoolState = PoolBase & {
    tokens: Token[];
};

export type PoolStateInput = PoolBase & {
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
