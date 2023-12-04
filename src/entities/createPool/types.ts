import { Address, Hex } from 'viem';

export interface CreatePoolBase {
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}

export type CreatePoolInput = CreatePoolWeightedInput;

export type CreatePoolWeightedInput = {
    name?: string;
    symbol: string;
    tokens: Address[];
    weights: { tokenAddress: Address; weight: string }[];
    rateProviders: { tokenAddress: Address; rateProviderAddress: Address }[];
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
    string,
];
