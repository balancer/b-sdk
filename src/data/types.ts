import { Address } from 'viem';

export type HumanAmount = `${number}`;

export interface MinimalToken {
    address: Address;
    decimals: number;
    index: number;
}

export interface PoolTokenWithBalance extends MinimalToken {
    balance: HumanAmount;
}

export interface PoolTokenWithUnderlying extends MinimalToken {
    underlying: Address;
}
