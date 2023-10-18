import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex } from '../../types';

export enum JoinKind {
    Init = 'Init',
    Unbalanced = 'Unbalanced',
    SingleAsset = 'SingleAsset',
    Proportional = 'Proportional',
}

// This will be extended for each pools specific input requirements
export type BaseJoinInput = {
    chainId: number;
    rpcUrl: string;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};

export type InitJoinInput = BaseJoinInput & {
    amountsIn: TokenAmount[];
    kind: JoinKind.Init;
};

export type UnbalancedJoinInput = BaseJoinInput & {
    amountsIn: TokenAmount[];
    kind: JoinKind.Unbalanced;
};

export type SingleAssetJoinInput = BaseJoinInput & {
    bptOut: TokenAmount;
    tokenIn: Address;
    kind: JoinKind.SingleAsset;
};

export type ProportionalJoinInput = BaseJoinInput & {
    bptOut: TokenAmount;
    kind: JoinKind.Proportional;
};

export type JoinInput =
    | InitJoinInput
    | UnbalancedJoinInput
    | SingleAssetJoinInput
    | ProportionalJoinInput;

// Returned from a join query
export type JoinQueryResult =
  BaseJoinQueryResult
 | ComposableStableJoinQueryResult;

export type BaseJoinQueryResult = {
    poolType: string;
    poolId: Hex;
    joinKind: JoinKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
    tokenInIndex?: number;
}

export type ComposableStableJoinQueryResult = BaseJoinQueryResult & {
    bptIndex?:number;
}

export type JoinCallInput = JoinQueryResult 
  & ComposableStableJoinQueryResult 
  & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export interface BaseJoin {
    query(input: JoinInput, poolState: PoolState): Promise<JoinQueryResult>;
    buildCall(input: JoinCallInput): {
        call: Hex;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
        maxAmountsIn: bigint[];
    };
}

export type JoinBuildOutput = {
    call: Hex;
    to: Address;
    value: bigint | undefined;
    minBptOut: bigint;
    maxAmountsIn: bigint[];
};

export type JoinConfig = {
    customPoolJoins: Record<string, BaseJoin>;
};