import { PoolType, TokenType } from '@/types';
import { Address, Hex } from 'viem';

export interface CreatePoolBase {
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}

export type CreatePoolBaseInput = {
    name?: string;
    symbol: string;
    salt?: Hex;
    chainId: number;
    protocolVersion: 2 | 3;
};

export type CreatePoolV2BaseInput = CreatePoolBaseInput & {
    swapFee: string;
    poolOwnerAddress: Address;
    protocolVersion: 2;
};

export type CreatePoolV2WeightedInput = CreatePoolV2BaseInput & {
    poolType: PoolType.Weighted;
    tokens: {
        address: Address;
        rateProvider: Address;
        weight: bigint;
    }[];
};

export type CreatePoolV2ComposableStableInput = CreatePoolV2BaseInput & {
    poolType: PoolType.ComposableStable;
    tokens: {
        address: Address;
        rateProvider: Address;
        tokenRateCacheDuration: bigint;
    }[];
    amplificationParameter: bigint;
    exemptFromYieldProtocolFeeFlag: boolean;
};

export type CreatePoolV3BaseInput = CreatePoolBaseInput & {
    protocolVersion: 3;
    pauseManager: Address;
    swapFeeManager: Address;
    swapFeePercentage: bigint;
    poolHooksContract: Address;
};

export type CreatePoolV3WeightedInput = CreatePoolV3BaseInput & {
    poolType: PoolType.Weighted;
    tokens: {
        address: Address;
        rateProvider: Address;
        weight: bigint;
        tokenType: TokenType;
        paysYieldFees?: boolean;
    }[];
};

export type CreatePoolInput =
    | CreatePoolV2WeightedInput
    | CreatePoolV2ComposableStableInput
    | CreatePoolV3WeightedInput;

export type CreatePoolBuildCallOutput = {
    callData: Hex;
    to: Address;
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

export type TokenConfig = {
    token: Address;
    tokenType: TokenType;
    rateProvider: Address;
    paysYieldFees: boolean;
};

export type PoolRoleAccounts = {
    pauseManager: Address;
    swapFeeManager: Address;
    poolCreator: Address;
};
