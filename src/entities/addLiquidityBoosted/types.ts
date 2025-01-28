import { InputAmount } from '@/types';
import { AddLiquidityKind } from '../addLiquidity/types';
import { Address, Hex } from 'viem';
import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';

export type AddLiquidityBoostedProportionalInput = {
    chainId: number;
    rpcUrl: string;
    tokensIn: Address[];
    referenceAmount: InputAmount;
    kind: AddLiquidityKind.Proportional;
    sender?: Address;
    userData?: Hex;
};

export type AddLiquidityBoostedUnbalancedInput = {
    chainId: number;
    rpcUrl: string;
    amountsIn: InputAmount[];
    kind: AddLiquidityKind.Unbalanced;
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
