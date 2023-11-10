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

type AddLiquidityBaseQueryOutput = {
    poolType: string;
    poolId: Hex;
    addLiquidityKind: AddLiquidityKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
    tokenInIndex?: number;
};

export type AddLiquidityWeightedQueryOutput = AddLiquidityBaseQueryOutput;

export type AddLiquidityComposableStableQueryOutput =
    AddLiquidityBaseQueryOutput & {
        bptIndex: number;
    };

export type AddLiquidityQueryOutput =
    | AddLiquidityWeightedQueryOutput
    | AddLiquidityComposableStableQueryOutput;

type AddLiquidityBaseCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export type AddLiquidityComposableStableCall = AddLiquidityBaseCall &
    AddLiquidityComposableStableQueryOutput;
export type AddLiquidityWeightedCall = AddLiquidityBaseCall &
    AddLiquidityBaseQueryOutput;

export type AddLiquidityCall =
    | AddLiquidityWeightedCall
    | AddLiquidityComposableStableCall;

export interface AddLiquidityBase {
    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput>;
    buildCall(input: AddLiquidityCall): {
        call: Hex;
        to: Address;
        value: bigint;
        minBptOut: bigint;
        maxAmountsIn: bigint[];
    };
}

export type AddLiquidityBuildOutput = {
    call: Hex;
    to: Address;
    value: bigint;
    minBptOut: bigint;
    maxAmountsIn: bigint[];
};

export type AddLiquidityConfig = {
    customAddLiquidityTypes: Record<string, AddLiquidityBase>;
};
