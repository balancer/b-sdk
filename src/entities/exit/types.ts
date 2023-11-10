import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { Address, InputAmount } from '../../types';
import { PoolState } from '../types';

export enum RemoveLiquidityKind {
    Unbalanced = 'Unbalanced', // exitExactOut
    SingleAsset = 'SingleAsset', // exitExactInSingleAsset
    Proportional = 'Proportional', // exitExactInProportional
}

// This will be extended for each pools specific output requirements
export type RemoveLiquidityBaseInput = {
    chainId: number;
    rpcUrl: string;
    exitWithNativeAsset?: boolean;
    toInternalBalance?: boolean;
};

export type RemoveLiquidityUnbalancedInput = RemoveLiquidityBaseInput & {
    amountsOut: InputAmount[];
    kind: RemoveLiquidityKind.Unbalanced;
};

export type RemoveLiquiditySingleTokenInput = RemoveLiquidityBaseInput & {
    bptIn: InputAmount;
    tokenOut: Address;
    kind: RemoveLiquidityKind.SingleAsset;
};

export type RemoveLiquidityProportionalInput = RemoveLiquidityBaseInput & {
    bptIn: InputAmount;
    kind: RemoveLiquidityKind.Proportional;
};

export type RemoveLiquidityInput =
    | RemoveLiquidityUnbalancedInput
    | RemoveLiquiditySingleTokenInput
    | RemoveLiquidityProportionalInput;

export type RemoveLiquidityQueryOutput =
    | RemoveLiquidityBaseQueryOutput
    | RemoveLiquidityComposableStableQueryOutput;

// Returned from a exit query
export type RemoveLiquidityBaseQueryOutput = {
    poolType: string;
    poolId: Address;
    removeLiquidityKind: RemoveLiquidityKind;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    tokenOutIndex?: number;
    toInternalBalance: boolean;
};

export type RemoveLiquidityComposableStableQueryOutput =
    RemoveLiquidityBaseQueryOutput & {
        bptIndex: number;
    };

type RemoveLiquidityBaseCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};
export type RemoveLiquidityComposableStableCall = RemoveLiquidityBaseCall &
    RemoveLiquidityComposableStableQueryOutput;
export type RemoveLiquidityWeightedCall = RemoveLiquidityBaseCall &
    RemoveLiquidityBaseQueryOutput;

export type RemoveLiquidityCall =
    | RemoveLiquidityComposableStableCall
    | RemoveLiquidityWeightedCall;

export type ExitBuildOutput = {
    call: Address;
    to: Address;
    value: bigint;
    maxBptIn: TokenAmount;
    minAmountsOut: TokenAmount[];
};

export interface RemoveLiquidityBase {
    query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput>;
    buildCall(input: RemoveLiquidityCall): ExitBuildOutput;
}

export type RemoveLiquidityConfig = {
    customRemoveLiquidityTypes: Record<string, RemoveLiquidityBase>;
};

export type ExitPoolRequest = {
    assets: Address[];
    minAmountsOut: bigint[];
    userData: Address;
    toInternalBalance: boolean;
};
