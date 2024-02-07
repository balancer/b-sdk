import { MinimalToken } from '../..';
import { Address, Hex } from 'viem';

export type TokenApi = Omit<MinimalToken, 'index'>;

export type Path = {
    pools: Address[] | Hex[];
    tokens: TokenApi[];
    outputAmountRaw: bigint;
    inputAmountRaw: bigint;
    balancerVersion: 2 | 3;
};
