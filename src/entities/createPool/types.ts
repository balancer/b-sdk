import { Address, Hex } from 'viem';

export interface CreatePoolBase {
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}

export type CreatePoolInput =
    | CreatePoolWeightedInput
    | CreatePoolComposableStableInput;

export type CreatePoolWeightedInput = {
    name?: string;
    symbol: string;
    tokens: {
        tokenAddress: Address;
        weight: string;
        rateProvider: Address;
    }[];
    swapFee: string;
    poolOwnerAddress: Address;
    salt?: Hex;
};

export type CreatePoolComposableStableInput = {
    name?: string;
    symbol: string;
    tokens: {
        tokenAddress: Address;
        rateProvider: Address;
        tokenRateCacheDuration: string;
    }[];
    amplificationParameter: string;
    exemptFromYieldProtocolFeeFlag: boolean;
    swapFee: string;
    poolOwnerAddress: Address;
    salt?: Hex;
};

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
