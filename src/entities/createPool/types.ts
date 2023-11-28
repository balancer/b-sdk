import { Address, Hex } from 'viem';

export interface CreatePoolBase {
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}

export type CreatePoolInput = CreateWeightedPoolInput;

export type CreateWeightedPoolInput = {
    name?: string;
    symbol: string;
    tokens: Address[];
    weights?: { tokenAddress: Address; weight: number }[];
    rateProviders?: { tokenAddress: Address; rateProviderAddress: Address }[];
    swapFee: string;
    poolOwnerAddress: Address;
    salt?: Hex;
};

export type CreatePoolBuildCallOutput = {
    call: Hex;
};

export type CreateWeightedPoolArgs = [
    string,
    string,
    Address[],
    bigint[],
    Address[],
    bigint,
    Address,
    string,
];
