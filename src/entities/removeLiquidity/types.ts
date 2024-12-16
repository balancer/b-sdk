import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';
import { Address, InputAmount } from '../../types';
import { PoolState } from '../types';
import {
    RemoveLiquidityV2BuildCallInput,
    RemoveLiquidityV2QueryOutput,
} from './removeLiquidityV2/types';
import { Permit } from '../permitHelper';
import { RemoveLiquidityBoostedBuildCallInput } from '../removeLiquidityBoosted/types';
import { Hex } from 'viem';

export enum RemoveLiquidityKind {
    Unbalanced = 'Unbalanced', // exact out
    SingleTokenExactOut = 'SingleTokenExactOut', // exact out (single token out)
    SingleTokenExactIn = 'SingleTokenExactIn', // exact in (single token out)
    Proportional = 'Proportional', // exact in (all tokens out)
    Recovery = 'Recovery', // exact in (all tokens out) - Pool in recovery mode
}

// This will be extended for each pools specific output requirements
export type RemoveLiquidityBaseInput = {
    chainId: number;
    rpcUrl: string;
    sender?: Address;
    userData?: Hex;
};

export type RemoveLiquidityUnbalancedInput = RemoveLiquidityBaseInput & {
    amountsOut: InputAmount[];
    kind: RemoveLiquidityKind.Unbalanced;
};

export type RemoveLiquiditySingleTokenExactOutInput =
    RemoveLiquidityBaseInput & {
        amountOut: InputAmount;
        kind: RemoveLiquidityKind.SingleTokenExactOut;
    };

export type RemoveLiquiditySingleTokenExactInInput =
    RemoveLiquidityBaseInput & {
        bptIn: InputAmount;
        tokenOut: Address;
        kind: RemoveLiquidityKind.SingleTokenExactIn;
    };

export type RemoveLiquidityProportionalInput = RemoveLiquidityBaseInput & {
    bptIn: InputAmount;
    kind: RemoveLiquidityKind.Proportional;
};

export type RemoveLiquidityRecoveryInput = RemoveLiquidityBaseInput & {
    bptIn: InputAmount;
    kind: RemoveLiquidityKind.Recovery;
};

export type RemoveLiquidityInput =
    | RemoveLiquidityUnbalancedInput
    | RemoveLiquiditySingleTokenExactOutInput
    | RemoveLiquiditySingleTokenExactInInput
    | RemoveLiquidityProportionalInput
    | RemoveLiquidityRecoveryInput;

// Returned from a remove liquidity query
export type RemoveLiquidityBaseQueryOutput = {
    poolType: string;
    poolId: Address;
    removeLiquidityKind: RemoveLiquidityKind;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    tokenOutIndex?: number;
    protocolVersion: 1 | 2 | 3;
    chainId: number;
    to: Address;
};

export type RemoveLiquidityQueryOutput =
    | RemoveLiquidityBaseQueryOutput
    | RemoveLiquidityV2QueryOutput;

export type RemoveLiquidityBaseBuildCallInput = {
    slippage: Slippage;
    wethIsEth?: boolean;
} & RemoveLiquidityBaseQueryOutput;

export type RemoveLiquidityBuildCallInput =
    | RemoveLiquidityBaseBuildCallInput
    | RemoveLiquidityV2BuildCallInput
    | RemoveLiquidityBoostedBuildCallInput;

export type RemoveLiquidityBuildCallOutput = {
    callData: Address;
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
    buildCall(
        input: RemoveLiquidityBuildCallInput,
    ): RemoveLiquidityBuildCallOutput;
    buildCallWithPermit(
        input: RemoveLiquidityBuildCallInput,
        permit: Permit,
    ): RemoveLiquidityBuildCallOutput;
}

export type RemoveLiquidityConfig = {
    customRemoveLiquidityTypes: Record<string, RemoveLiquidityBase>;
};

// type exposed because FE team uses it for batching unstake and remove liquidity operations
export type ExitPoolRequest = {
    assets: Address[];
    minAmountsOut: bigint[];
    userData: Address;
    toInternalBalance: boolean;
};
