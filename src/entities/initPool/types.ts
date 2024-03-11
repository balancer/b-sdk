import { Address, Hex } from 'viem';
import { InputAmount } from '../../types';
import { PoolState } from '../types';

export interface InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput;
}

export type InitPoolBuildOutput = {
    call: Hex;
    to: Address;
    value: bigint;
};

export type InitPoolInput = InitPoolInputV2 | InitPoolInputV3;

type InitBaseInput = {
    amountsIn: InputAmount[];
    chainId: number;
    wethIsEth?: boolean;
};

export type InitPoolInputV2 = InitBaseInput & {
    sender: Address;
    recipient: Address;
    fromInternalBalance?: boolean;
};

export type InitPoolInputV3 = InitBaseInput & {
    minBptAmountOut: bigint;
};

export type InitPoolConfig = {
    initPoolTypes: Record<string, InitPoolBase>;
};

export type InitializeArgs = [
    Address,
    Address[],
    bigint[],
    bigint,
    boolean,
    Hex,
];
