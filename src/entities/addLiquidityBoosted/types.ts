import { InputAmount } from '@/types';
import { AddLiquidityKind } from '../addLiquidity/types';
import { Address, Hex } from 'viem';
import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';

export type AddLiquidityBoostedProportionalInput = {
    chainId: number;
    rpcUrl: string;
    referenceAmount: InputAmount;
    kind: AddLiquidityKind.Proportional;
    wrapUnderlying: boolean[];
    sender?: Address;
    userData?: Hex;
};

export type AddLiquidityBoostedUnbalancedInput = {
    chainId: number;
    rpcUrl: string;
    amountsIn: InputAmount[];
    kind: AddLiquidityKind.Unbalanced;
    wrapUnderlying: boolean[];
    sender?: Address;
    userData?: Hex;
};

export type AddLiquidityBoostedInput =
    | AddLiquidityBoostedUnbalancedInput
    | AddLiquidityBoostedProportionalInput;

export type AddLiquidityBoostedQueryOutput = {
    poolId: Hex;
    poolType: string;
    addLiquidityKind: AddLiquidityKind;
    wrapUnderlying: boolean[];
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    chainId: number;
    protocolVersion: 3;
    userData: Hex;
    to: Address;
};

export type AddLiquidityBoostedBuildCallInput = {
    slippage: Slippage;
    wethIsEth?: boolean;
} & AddLiquidityBoostedQueryOutput;
