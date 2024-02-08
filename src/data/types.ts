import { Address } from 'viem';

export type HumanAmount = `${number}`;

export interface MinimalToken {
    address: Address;
    decimals: number;
    index: number;
}

export interface RawPoolToken extends MinimalToken {
    symbol: string;
    name: string;
    balance: HumanAmount;
}

export interface RawWeightedPoolToken extends RawPoolToken {
    weight: HumanAmount;
}

export interface RawPoolTokenWithRate extends RawPoolToken {
    priceRate: HumanAmount;
}

export interface RawFxPoolToken extends RawPoolToken {
    token: {
        latestFXPrice: HumanAmount;
        fxOracleDecimals?: number;
    };
}
