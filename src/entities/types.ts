import { MinimalToken } from '../data';
import { Address, Hex } from '../types';

// Returned from API and used as input
export type PoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: MinimalToken[];
};

export type Amounts = {
    maxAmountsIn: bigint[];
    tokenInIndex: number | undefined;
    minimumBpt: bigint;
};
