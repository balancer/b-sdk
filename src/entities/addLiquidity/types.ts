import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex, InputAmount } from '../../types';
import {
    AddLiquidityV2Call,
    AddLiqudityV2QueryOutput,
} from './addLiquidityV2/types';

export enum AddLiquidityKind {
    Unbalanced = 'Unbalanced',
    SingleToken = 'SingleToken',
    Proportional = 'Proportional',
}

// This will be extended for each pools specific input requirements
export type AddLiquidityBaseInput = {
    chainId: number;
    rpcUrl: string;
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

export type AddLiquidityQueryOutput =
    | AddLiquidityBaseQueryOutput
    | AddLiqudityV2QueryOutput;

export type AddLiquidityBaseCall = {
    slippage: Slippage;
    chainId: number;
    sendNativeAsset?: boolean;
} & AddLiquidityBaseQueryOutput;

export type AddLiquidityCall = AddLiquidityBaseCall | AddLiquidityV2Call;

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
