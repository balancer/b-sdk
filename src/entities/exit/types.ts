import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { Address } from '../../types';
import { PoolState } from '../types';

export enum ExitKind {
    UNBALANCED = 'UNBALANCED', // exitExactOut
    SINGLE_ASSET = 'SINGLE_ASSET', // exitExactInSingleAsset
    PROPORTIONAL = 'PROPORTIONAL', // exitExactInProportional
}

// This will be extended for each pools specific output requirements
export type BaseExitInput = {
    chainId: number;
    rpcUrl: string;
    exitWithNativeAsset?: boolean;
    toInternalBalance?: boolean;
};

export type UnbalancedExitInput = BaseExitInput & {
    amountsOut: TokenAmount[];
    kind: ExitKind.UNBALANCED;
};

export type SingleAssetExitInput = BaseExitInput & {
    bptIn: TokenAmount;
    tokenOut: Address;
    kind: ExitKind.SINGLE_ASSET;
};

export type ProportionalExitInput = BaseExitInput & {
    bptIn: TokenAmount;
    kind: ExitKind.PROPORTIONAL;
};

export type ExitInput =
    | UnbalancedExitInput
    | SingleAssetExitInput
    | ProportionalExitInput;

// Returned from a exit query
export type ExitQueryResult = {
    poolType: string;
    id: Address;
    exitKind: ExitKind;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    tokenOutIndex?: number;
    toInternalBalance?: boolean;
};

export type ExitCallInput = ExitQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export type ExitBuildOutput = {
    call: Address;
    to: Address;
    value: bigint | undefined;
    maxBptIn: bigint;
    minAmountsOut: bigint[];
};

export interface BaseExit {
    query(input: ExitInput, poolState: PoolState): Promise<ExitQueryResult>;
    buildCall(input: ExitCallInput): ExitBuildOutput;
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
