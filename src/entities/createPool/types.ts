import { PoolType, TokenType } from '@/types';
import { Address, Hex } from 'viem';

export interface CreatePoolBase {
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}

export type CreatePoolBaseInput = {
    name?: string;
    symbol: string;
    salt?: Hex;
    balancerVersion: 2 | 3;
};

export type CreatePoolV2BaseInput = CreatePoolBaseInput & {
    swapFee: string;
    poolOwnerAddress: Address;
    balancerVersion: 2;
};

export type CreatePoolV2WeightedInput = CreatePoolV2BaseInput & {
    poolType: PoolType.Weighted;
    tokens: {
        tokenAddress: Address;
        rateProvider: Address;
        weight: bigint;
    }[];
};

export type CreatePoolV2ComposableStableInput = CreatePoolV2BaseInput & {
    poolType: PoolType.ComposableStable;
    tokens: {
        tokenAddress: Address;
        rateProvider: Address;
        tokenRateCacheDuration: bigint;
    }[];
    amplificationParameter: bigint;
    exemptFromYieldProtocolFeeFlag: boolean;
};

export type CreatePoolV3BaseInput = CreatePoolBaseInput & {
    balancerVersion: 3;
};

export type CreatePoolV3WeightedInput = CreatePoolV3BaseInput & {
    poolType: PoolType.Weighted;
    tokens: {
        tokenAddress: Address;
        rateProvider: Address | 0;
        weight: bigint;
        tokenType: TokenType;
        yieldFeeExempt?: boolean;
    }[];
};

export type CreatePoolInput =
    | CreatePoolV2WeightedInput
    | CreatePoolV2ComposableStableInput
    | CreatePoolV3WeightedInput;

export type CreatePoolBuildCallOutput = {
    call: Hex;
};

export type CreatePoolV2WeightedArgs = [
    string,
    string,
    Address[],
    bigint[],
    Address[],
    bigint,
    Address,
    Hex,
];

export type CreatePoolV2ComposableStableArgs = [
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

export type CreatePoolV3WeightedArgs = [
    string,
    string,
    TokenConfig[],
    bigint[],
    Hex,
];

export type TokenConfig = {
    token: Address;
    tokenType: TokenType;
    rateProvider: Address;
    yieldFeeExempt: boolean;
};
