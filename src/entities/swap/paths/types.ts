import { Address, Hex } from 'viem';
import { MinimalToken } from '../../..';

export type TokenApi = Omit<MinimalToken, 'index'>;

export type Path = {
    pools: Address[] | Hex[];
    tokens: TokenApi[];
    outputAmountRaw: bigint;
    inputAmountRaw: bigint;
    protocolVersion: 0 | 2 | 3;
};
