import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { Address, InputAmount } from '../../types';
import { PoolState } from '../types';

export enum ExitKind {
    Unbalanced = 'Unbalanced', // exitExactOut
    SingleAsset = 'SingleAsset', // exitExactInSingleAsset
    Proportional = 'Proportional', // exitExactInProportional
}

// This will be extended for each pools specific output requirements
export type BaseExitInput = {
    chainId: number;
    rpcUrl: string;
    exitWithNativeAsset?: boolean;
    toInternalBalance?: boolean;
};

export type UnbalancedExitInput = BaseExitInput & {
    amountsOut: InputAmount[];
    kind: ExitKind.Unbalanced;
};

export type SingleAssetExitInput = BaseExitInput & {
    bptIn: InputAmount;
    tokenOut: Address;
    kind: ExitKind.SingleAsset;
};

export type ProportionalExitInput = BaseExitInput & {
    bptIn: InputAmount;
    kind: ExitKind.Proportional;
};

export type ExitInput =
    | UnbalancedExitInput
    | SingleAssetExitInput
    | ProportionalExitInput;

export type ExitQueryResult =
    | BaseExitQueryResult
    | ComposableStableExitQueryResult;

// Returned from a exit query
export type BaseExitQueryResult = {
    poolType: string;
    poolId: Address;
    exitKind: ExitKind;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    tokenOutIndex?: number;
    toInternalBalance: boolean;
};

export type ComposableStableExitQueryResult = BaseExitQueryResult & {
    bptIndex: number;
};

type BaseExitCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};
export type ComposableStableExitCall = BaseExitCall &
    ComposableStableExitQueryResult;
export type WeightedExitCall = BaseExitCall & BaseExitQueryResult;

export type ExitCall = ComposableStableExitCall | WeightedExitCall;

export type ExitBuildOutput = {
    call: Address;
    to: Address;
    value: bigint;
    maxBptIn: TokenAmount;
    minAmountsOut: TokenAmount[];
};

export interface BaseExit {
    query(input: ExitInput, poolState: PoolState): Promise<ExitQueryResult>;
    buildCall(input: ExitCall): ExitBuildOutput;
}

export type ExitConfig = {
    customPoolExits: Record<string, BaseExit>;
};

export type ExitPoolRequest = {
    assets: Address[];
    minAmountsOut: bigint[];
    userData: Address;
    toInternalBalance: boolean;
};
