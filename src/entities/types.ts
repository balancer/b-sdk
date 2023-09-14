import { Address, Hex } from '../types';

// Returned from API and used as input
export type PoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: TokenApi[];
};

export type TokenApi = {
    address: Address;
    decimals: number;
    index: number;
};

export type Amounts = {
    maxAmountsIn: bigint[];
    tokenInIndex: number | undefined;
    minimumBpt: bigint;
};
