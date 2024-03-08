import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex, InputAmount } from '../../types';
import {
    AddLiquidityV2BuildCallInput,
    AddLiquidityV2QueryOutput,
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
    tokenInIndex?: number;
    vaultVersion: 2 | 3;
};

export type AddLiquidityQueryOutput =
    | AddLiquidityBaseQueryOutput
    | AddLiquidityV2QueryOutput;

export type AddLiquidityBaseBuildCallInput = {
    slippage: Slippage;
    chainId: number;
    wethIsEth?: boolean;
} & AddLiquidityBaseQueryOutput;

export type AddLiquidityBuildCallInput =
    | AddLiquidityBaseBuildCallInput
    | AddLiquidityV2BuildCallInput;

export interface AddLiquidityBase {
    query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityQueryOutput>;
    buildCall(input: AddLiquidityBuildCallInput): AddLiquidityBuildCallOutput;
}

export type AddLiquidityBuildCallOutput = {
    call: Hex;
    to: Address;
    value: bigint;
    minBptOut: TokenAmount;
    maxAmountsIn: TokenAmount[];
};

export type AddLiquidityConfig = {
    customAddLiquidityTypes: Record<string, AddLiquidityBase>;
};

// type consumed by FE team, so should be exported here
export type JoinPoolRequest = {
    assets: Address[];
    maxAmountsIn: readonly bigint[];
    userData: Hex;
    fromInternalBalance: boolean;
};
