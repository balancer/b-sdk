import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex, InputAmount } from '../../types';

export enum AddLiquidityKind {
    Init = 'Init',
    Unbalanced = 'Unbalanced',
    SingleAsset = 'SingleAsset',
    Proportional = 'Proportional',
}

// This will be extended for each pools specific input requirements
type AddLiquidityBaseInput = {
    chainId: number;
    rpcUrl: string;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};

export type AddLiquidityInitInput = AddLiquidityBaseInput & {
    amountsIn: InputAmount[];
    kind: AddLiquidityKind.Init;
};

export type AddLiquidityUnbalancedInput = AddLiquidityBaseInput & {
    amountsIn: InputAmount[];
    kind: AddLiquidityKind.Unbalanced;
};

export type AddLiquiditySingleAssetInput = AddLiquidityBaseInput & {
    bptOut: InputAmount;
    tokenIn: Address;
    kind: AddLiquidityKind.SingleAsset;
};

export type AddLiquidityProportionalInput = AddLiquidityBaseInput & {
    bptOut: InputAmount;
    kind: AddLiquidityKind.Proportional;
};

export type AddLiquidityInput =
    | AddLiquidityInitInput
    | AddLiquidityUnbalancedInput
    | AddLiquiditySingleAssetInput
    | AddLiquidityProportionalInput;

type AddLiquidityBaseQueryResult = {
    poolType: string;
    poolId: Hex;
    addLiquidityKind: AddLiquidityKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
    tokenInIndex?: number;
};

export type AddLiquidityWeightedQueryResult = AddLiquidityBaseQueryResult;

export type AddLiquidityComposableStableQueryResult =
    AddLiquidityBaseQueryResult & {
        bptIndex: number;
    };

export type AddLiquidityQueryResult =
    | AddLiquidityWeightedQueryResult
    | AddLiquidityComposableStableQueryResult;

type AddLiquidityBaseCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export type AddLiquidityComposableStableCall = AddLiquidityBaseCall &
    AddLiquidityComposableStableQueryResult;
export type AddLiquidityWeightedCall = AddLiquidityBaseCall &
    AddLiquidityBaseQueryResult;

export type AddLiquidityCall =
    | AddLiquidityWeightedCall
    | AddLiquidityComposableStableCall;

export interface AddLiquidityBase {
    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryResult>;
    buildCall(input: AddLiquidityCall): {
        call: Hex;
        to: Address;
        value: bigint;
        minBptOut: bigint;
        maxAmountsIn: bigint[];
    };
}

export type JoinBuildOutput = {
    call: Hex;
    to: Address;
    value: bigint;
    minBptOut: bigint;
    maxAmountsIn: bigint[];
};

export type AddLiquidityConfig = {
    customAddLiquidityTypes: Record<string, AddLiquidityBase>;
};
