import { Address } from 'viem';

export type HumanAmount = `${number}`;

export interface MinimalToken {
    address: Address;
    decimals: number;
    index: number;
    symbol?: string;
    name?: string;
}

export interface PoolTokenWithBalance extends MinimalToken {
    balance: HumanAmount;
}
