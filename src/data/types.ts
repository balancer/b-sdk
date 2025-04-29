import { Address } from 'viem';

export type HumanAmount = `${number}`;

export interface MinimalToken {
    address: Address;
    decimals: number;
    index: number;
}

export interface MinimalTokenWithRate extends MinimalToken {
    rate?: bigint;
}

export interface PoolTokenWithBalance extends MinimalToken {
    balance: HumanAmount;
}
