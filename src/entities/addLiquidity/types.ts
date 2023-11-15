import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex, InputAmount } from '../../types';

export enum AddLiquidityKind {
    Init = 'Init',
    Unbalanced = 'Unbalanced',
    SingleToken = 'SingleToken',
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

export type AddLiquiditySingleTokenInput = AddLiquidityBaseInput & {
    bptOut: InputAmount;
    tokenIn: Address;
    kind: AddLiquidityKind.SingleToken;
};

export type AddLiquidityProportionalInput = AddLiquidityBaseInput & {
    bptOut: InputAmount;
    kind: AddLiquidityKind.Proportional;
};

export type AddLiquidityInput =
    | AddLiquidityInitInput
    | AddLiquidityUnbalancedInput
    | AddLiquiditySingleTokenInput
    | AddLiquidityProportionalInput;

export type AddLiquidityBaseQueryOutputV2 = {
    poolType: string;
    poolId: Hex;
    addLiquidityKind: AddLiquidityKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
    tokenInIndex?: number;
    balancerVersion: 2;
};

export type AddLiquidityBaseQueryOutputV3 = {
    poolType: string;
    poolAddress: Hex;
    addLiquidityKind: AddLiquidityKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    tokenInIndex?: number;
    balancerVersion: 3;
};

export type AddLiquidityComposableStableQueryOutput =
    AddLiquidityBaseQueryOutputV2 & {
        bptIndex: number;
    };

export type AddLiquidityQueryOutput =
    | AddLiquidityBaseQueryOutputV2
    | AddLiquidityBaseQueryOutputV3
    | AddLiquidityComposableStableQueryOutput;

type AddLiquidityBaseCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};

export type AddLiquidityComposableStableCall = AddLiquidityBaseCall &
    AddLiquidityComposableStableQueryOutput;
export type AddLiquidityWeightedV2Call = AddLiquidityBaseCall &
    AddLiquidityBaseQueryOutputV2;
export type AddLiquidityWeightedV3Call = AddLiquidityBaseCall &
    AddLiquidityBaseQueryOutputV3;

export type AddLiquidityCall =
    | AddLiquidityWeightedV2Call
    | AddLiquidityWeightedV3Call
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
        minBptOut: TokenAmount;
        maxAmountsIn: TokenAmount[];
    };
}

export type AddLiquidityBuildOutput = {
    call: Hex;
    to: Address;
    value: bigint;
    minBptOut: TokenAmount;
    maxAmountsIn: TokenAmount[];
};

export type AddLiquidityConfig = {
    customAddLiquidityTypes: Record<string, AddLiquidityBase>;
};
