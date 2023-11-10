import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex, InputAmount } from '../../types';

export enum JoinKind {
    Init = 'Init',
    Unbalanced = 'Unbalanced',
    SingleAsset = 'SingleAsset',
    Proportional = 'Proportional',
}

// This will be extended for each pools specific input requirements
type BaseJoinInput = {
    chainId: number;
    rpcUrl: string;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};

export type InitJoinInput = BaseJoinInput & {
    amountsIn: InputAmount[];
    kind: JoinKind.Init;
};

export type UnbalancedJoinInput = BaseJoinInput & {
    amountsIn: InputAmount[];
    kind: JoinKind.Unbalanced;
};

export type SingleAssetJoinInput = BaseJoinInput & {
    bptOut: InputAmount;
    tokenIn: Address;
    kind: JoinKind.SingleAsset;
};

export type ProportionalJoinInput = BaseJoinInput & {
    bptOut: InputAmount;
    kind: JoinKind.Proportional;
};

export type JoinInput =
    | InitJoinInput
    | UnbalancedJoinInput
    | SingleAssetJoinInput
    | ProportionalJoinInput;

type BaseJoinQueryResult = {
    poolType: string;
    poolId: Hex;
    joinKind: JoinKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
    tokenInIndex?: number;
};

export type WeightedJoinQueryResult = BaseJoinQueryResult;

export type ComposableStableJoinQueryResult = BaseJoinQueryResult & {
    bptIndex: number;
};

export type JoinQueryResult =
    | WeightedJoinQueryResult
    | ComposableStableJoinQueryResult;

type BaseJoinCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export type ComposableJoinCall = BaseJoinCall & ComposableStableJoinQueryResult;
export type WeightedJoinCall = BaseJoinCall & BaseJoinQueryResult;

export type JoinCall = WeightedJoinCall | ComposableJoinCall;

export interface BaseJoin {
    query(input: JoinInput, poolState: PoolState): Promise<JoinQueryResult>;
    buildCall(input: JoinCall): {
        call: Hex;
        to: Address;
        value: bigint;
        minBptOut: TokenAmount;
        maxAmountsIn: TokenAmount[];
    };
}

export type JoinBuildOutput = {
    call: Hex;
    to: Address;
    value: bigint;
    minBptOut: TokenAmount;
    maxAmountsIn: TokenAmount[];
};

export type JoinConfig = {
    customPoolJoins: Record<string, BaseJoin>;
};
