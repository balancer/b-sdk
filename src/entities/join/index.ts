import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { Address } from '../../types';

export enum JoinKind {
    Init = 'Init',
    ExactIn = 'ExactIn',
    ExactOutSingleAsset = 'ExactOutSingleAsset',
    ExactOutProportional = 'ExactOutProportional',
}

// Returned from API and used as input
export type PoolState = {
    id: Address;
    address: Address;
    type: string;
    tokens: {
        address: Address;
        decimals: number;
    }[]; // already properly sorted in case different versions sort them differently
};

// This will be extended for each pools specific input requirements
export type BaseJoinInput = {
    chainId: number;
    rpcUrl?: string;
    joinWithNativeAsset?: boolean;
};

export type InitJoinInput = BaseJoinInput & {
    initAmountsIn: TokenAmount[];
    kind: JoinKind.Init;
};

export type ExactInJoinInput = BaseJoinInput & {
    amountsIn: TokenAmount[];
    kind: JoinKind.ExactIn;
};

export type ExactOutSingleAssetJoinInput = BaseJoinInput & {
    bptOut: TokenAmount;
    tokenIn: Address;
    kind: JoinKind.ExactOutSingleAsset;
};

export type ExactOutProportionalJoinInput = BaseJoinInput & {
    bptOut: TokenAmount;
    kind: JoinKind.ExactOutProportional;
};

export type JoinInput =
    | InitJoinInput
    | ExactInJoinInput
    | ExactOutSingleAssetJoinInput
    | ExactOutProportionalJoinInput;

// Returned from a join query
export type JoinQueryResult = {
    id: Address;
    joinKind: JoinKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    tokenInIndex?: number;
};

export type JoinCallInput = JoinQueryResult & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export interface BaseJoin {
    getInstance(): BaseJoin;
    query(input: JoinInput, poolState: PoolState): Promise<JoinQueryResult>;
    buildCall(input: JoinCallInput): {
        call: Address;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
    };
}
