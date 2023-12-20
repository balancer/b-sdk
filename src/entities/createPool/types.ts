import { PoolType } from '@/types';
import { Address, Hex } from 'viem';

export interface CreatePoolBase {
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}

export type CreatePoolBaseInput = {
    name?: string;
    symbol: string;
    swapFee: string;
    poolOwnerAddress: Address;
    salt?: Hex;
    balancerVersion: 2 | 3;
};

export type CreatePoolWeightedInput = CreatePoolBaseInput & {
    poolType: PoolType.Weighted;
    tokens: {
        tokenAddress: Address;
        rateProvider: Address;
        weight: bigint;
    }[];
};

export type CreatePoolComposableStableInput = CreatePoolBaseInput & {
    poolType: PoolType.ComposableStable;
    tokens: {
        tokenAddress: Address;
        rateProvider: Address;
        tokenRateCacheDuration: bigint;
    }[];
    amplificationParameter: bigint;
    exemptFromYieldProtocolFeeFlag: boolean;
};

export type CreatePoolInput =
    | CreatePoolWeightedInput
    | CreatePoolComposableStableInput;

export type CreatePoolBuildCallOutput = {
    call: Hex;
};

export type CreatePoolWeightedArgs = [
    string,
    string,
    Address[],
    bigint[],
    Address[],
    bigint,
    Address,
    Hex,
];

export type CreatePoolComposableStableArgs = [
    string,
    string,
    Address[],
    bigint,
    Address[],
    bigint[],
    boolean,
    bigint,
    Address,
    Hex,
];
