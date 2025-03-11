import { PoolType, TokenType } from '@/types';
import { Address, Hex } from 'viem';
import { CreatePoolGyroECLPInput } from './createPoolV3/gyroECLP/createPoolGyroECLP';

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
    enableDonation: boolean;
    disableUnbalancedLiquidity: boolean;
};

export type CreatePoolV3StableInput = CreatePoolV3BaseInput & {
    poolType: PoolType.Stable;
    amplificationParameter: bigint; // value between 1e3 and 5000e3
    tokens: TokenConfig[];
};

export type CreatePoolStableSurgeInput = Omit<
    CreatePoolV3StableInput,
    'poolHooksContract' | 'poolType' | 'disableUnbalancedLiquidity'
> & {
    poolType: PoolType.StableSurge;
};

export type CreatePoolV3WeightedInput = CreatePoolV3BaseInput & {
    poolType: PoolType.Weighted;
    tokens: (TokenConfig & { weight: bigint })[];
};

export type LBPParams = {
    owner: Address;
    projectToken: Address;
    reserveToken: Address;
    projectTokenStartWeight: bigint;
    reserveTokenStartWeight: bigint;
    projectTokenEndWeight: bigint;
    reserveTokenEndWeight: bigint;
    startTime: bigint;
    endTime: bigint;
    blockProjectTokenSwapsIn: boolean;
};

// The pool uses default liquidity management values (no setters available)
// swapFeeManager replaced by LBPParams.owner
// pauseManager is governance by default
// the pool is the hook itself. No hooksetter available
export type CreatePoolLiquidityBootstrappingInput = Omit<
    CreatePoolV3BaseInput,
    | 'pauseManager'
    | 'swapFeeManager'
    | 'poolHooksContract'
    | 'enableDonation'
    | 'disableUnbalancedLiquidity'
> & {
    lbpParams: LBPParams;
    poolType: PoolType.LiquidityBootstrapping;
};

export type CreatePoolInput =
    | CreatePoolV2WeightedInput
    | CreatePoolV2ComposableStableInput
    | CreatePoolV3WeightedInput
    | CreatePoolV3StableInput
    | CreatePoolStableSurgeInput
    | CreatePoolGyroECLPInput
    | CreatePoolLiquidityBootstrappingInput;

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
    address: Address;
    tokenType: TokenType;
    rateProvider: Address;
    paysYieldFees: boolean;
};

export type PoolRoleAccounts = {
    pauseManager: Address;
    swapFeeManager: Address;
    poolCreator: Address;
};
