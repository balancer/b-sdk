import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex, InputAmount } from '../../types';

export enum AddLiquidityKind {
    Unbalanced = 'Unbalanced',
    SingleToken = 'SingleToken',
    Proportional = 'Proportional',
}

// This will be extended for each pools specific input requirements
export type AddLiquidityBaseInput = {
    chainId: number;
    rpcUrl: string;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
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
    | AddLiquidityUnbalancedInput
    | AddLiquiditySingleTokenInput
    | AddLiquidityProportionalInput;

export type AddLiquidityBaseQueryOutput = {
    poolType: string;
    poolId: Hex;
    addLiquidityKind: AddLiquidityKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
    tokenInIndex?: number;
    vaultVersion: 2 | 3;
};

export type AddLiquidityWeightedQueryOutput = AddLiquidityBaseQueryOutput;

export type AddLiquidityComposableStableQueryOutput =
    AddLiquidityBaseQueryOutput & {
        bptIndex: number;
    };

export type AddLiquidityQueryOutput =
    | AddLiquidityBaseQueryOutput
    | AddLiquidityWeightedQueryOutput
    | AddLiquidityComposableStableQueryOutput;

export type AddLiquidityBaseCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    chainId: number;
    wethIsEth: boolean;
} & AddLiquidityBaseQueryOutput;

export type AddLiquidityWeightedCall = AddLiquidityBaseCall;
export type AddLiquidityComposableStableCall = AddLiquidityBaseCall &
    AddLiquidityComposableStableQueryOutput;

export type AddLiquidityCall =
    | AddLiquidityBaseCall
    | AddLiquidityWeightedCall
    | AddLiquidityComposableStableCall;

export interface AddLiquidityBase {
    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput>;
    buildCall(input: AddLiquidityCall): AddLiquidityBuildOutput;
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

export type JoinPoolRequest = {
    assets: Address[];
    maxAmountsIn: bigint[];
    userData: Hex;
    fromInternalBalance: boolean;
};
