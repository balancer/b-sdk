import { PoolType, TokenType } from '@/types';
import { Address, Hex } from 'viem';
import {
    EclpParams,
    DerivedEclpParams,
} from './createPoolV3/gyroECLP/createPoolGyroECLP';

///// Shared types for v2 and v3 /////
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

export type CreatePoolInput =
    | CreatePoolV2WeightedInput
    | CreatePoolV2ComposableStableInput
    | CreatePoolV3WeightedInput
    | CreatePoolV3StableInput
    | CreatePoolStableSurgeInput
    | CreatePoolGyroECLPInput
    | CreatePoolReClammInput
    | CreatePoolLiquidityBootstrappingInput
    | CreatePoolLiquidityBootstrappingWithMigrationInput;

export type CreatePoolBuildCallOutput = {
    callData: Hex;
    to: Address;
};

///// Balancer v2 /////
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

///// Balancer v3 /////
export type CreatePoolV3BaseInput<T = TokenConfig> = CreatePoolBaseInput & {
    protocolVersion: 3;
    pauseManager: Address;
    swapFeeManager: Address;
    swapFeePercentage: bigint;
    poolHooksContract: Address;
    enableDonation: boolean;
    disableUnbalancedLiquidity: boolean;
    tokens: T[];
};

export type PoolRoleAccounts = {
    pauseManager: Address;
    swapFeeManager: Address;
    poolCreator: Address;
};

export type TokenConfig = {
    address: Address;
    tokenType: TokenType;
    rateProvider: Address;
    paysYieldFees: boolean;
};

export type TokenConfigWithWeight = TokenConfig & {
    weight: bigint;
};

export type CreatePoolV3WeightedInput =
    CreatePoolV3BaseInput<TokenConfigWithWeight> & {
        poolType: PoolType.Weighted;
    };

export type CreatePoolV3StableInput = CreatePoolV3BaseInput & {
    poolType: PoolType.Stable;
    amplificationParameter: bigint;
};

export type CreatePoolStableSurgeInput = Omit<
    CreatePoolV3StableInput,
    'poolHooksContract' | 'poolType' | 'disableUnbalancedLiquidity'
> & {
    poolType: PoolType.StableSurge;
};

export type CreatePoolGyroECLPInput = CreatePoolV3BaseInput & {
    poolType: PoolType.GyroE;
    eclpParams: EclpParams;
    derivedEclpParams?: DerivedEclpParams;
};

export type CreatePoolReClammInput = Omit<
    CreatePoolV3BaseInput,
    'poolHooksContract' | 'disableUnbalancedLiquidity' | 'enableDonation'
> & {
    poolType: PoolType.ReClamm;
    priceParams: {
        initialMinPrice: bigint;
        initialMaxPrice: bigint;
        initialTargetPrice: bigint;
        tokenAPriceIncludesRate: boolean;
        tokenBPriceIncludesRate: boolean;
    };
    priceShiftDailyRate: bigint;
    centerednessMargin: bigint;
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
    | 'tokens'
> & {
    lbpParams: LBPParams;
    poolType: PoolType.LiquidityBootstrapping;
    poolCreator?: Address;
};

export type LBPMigrationParams = {
    bptLockDuration: bigint;
    bptPercentageToMigrate: bigint;
    migrationWeightProjectToken: bigint;
    migrationWeightReserveToken: bigint;
};

export type CreatePoolLiquidityBootstrappingWithMigrationInput =
    CreatePoolLiquidityBootstrappingInput & {
        lbpMigrationParams: LBPMigrationParams;
    };
