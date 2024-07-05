import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { PoolState } from '../types';
import { Address, Hex, InputAmount } from '../../types';
import {
    AddLiquidityV2BuildCallInput,
    AddLiquidityV2QueryOutput,
} from './addLiquidityV2/types';
import { Permit2 } from '../permit2';

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
    chainId: number;
    tokenInIndex?: number;
    protocolVersion: 1 | 2 | 3;
};

export type AddLiquidityQueryOutput =
    | AddLiquidityBaseQueryOutput
    | AddLiquidityV2QueryOutput;

export type AddLiquidityBaseBuildCallInput = {
    slippage: Slippage;
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
    buildCallWithPermit2(
        input: AddLiquidityBuildCallInput,
        permit2: Permit2,
    ): AddLiquidityBuildCallOutput;
}

export type AddLiquidityBuildCallOutput = {
    callData: Hex;
    to: Address;
    value: bigint;
    minBptOut: TokenAmount;
    maxAmountsIn: TokenAmount[];
};

export type AddLiquidityConfig = {
    customAddLiquidityTypes: Record<string, AddLiquidityBase>;
};

// type exposed because FE team uses it for batching add liquidity and stake operations
export type JoinPoolRequest = {
    assets: Address[];
    maxAmountsIn: readonly bigint[];
    userData: Hex;
    fromInternalBalance: boolean;
};
