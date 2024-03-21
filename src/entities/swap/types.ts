import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../..';
import { SwapKind } from '../../types';
import { Address, Hex } from 'viem';
import { SwapCallBuildInputBaseV2 } from './swaps/v2';
import { Path } from './paths/types';

export type SwapInput = {
    chainId: number;
    paths: Path[];
    swapKind: SwapKind;
};

type SwapCallBuildInputBase = {
    deadline?: bigint;
    slippage: Slippage;
    wethIsEth?: boolean;
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput;
};

export type SwapCallBuildInput =
    | SwapCallBuildInputBase
    | (SwapCallBuildInputBase & SwapCallBuildInputBaseV2);

export type SwapBuildOutputBase = {
    to: Address;
    callData: Hex;
    value: bigint;
};

export type SwapBuildOutputExactIn = SwapBuildOutputBase & {
    minAmountOut: TokenAmount;
};

export type SwapBuildOutputExactOut = SwapBuildOutputBase & {
    maxAmountIn: TokenAmount;
};

export type QueryOutputBase = {
    swapKind: SwapKind;
    pathAmounts?: bigint[];
};

export type ExactInQueryOutput = QueryOutputBase & {
    swapKind: SwapKind.GivenIn;
    expectedAmountOut: TokenAmount;
};

export type ExactOutQueryOutput = QueryOutputBase & {
    swapKind: SwapKind.GivenOut;
    expectedAmountIn: TokenAmount;
};
