import { TokenAmount } from '../tokenAmount';
import { MinimalToken, Slippage } from '../..';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../types';
import { PathWithAmount } from './pathWithAmount';
import { Address, Hex } from 'viem';
import { SwapCallBuildV2, SwapCallV2 as CallInputV2 } from './swapV2';
import {
    SingleTokenExactIn,
    SingleTokenExactOut,
    SwapCallBuildV3,
    SwapPathExactAmountIn,
    SwapPathExactAmountOut,
} from './swapV3';

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

export type TokenApi = Omit<MinimalToken, 'index'>;

export type Path = {
    pools: Address[] | Hex[];
    tokens: TokenApi[];
    outputAmountRaw: bigint;
    inputAmountRaw: bigint;
    balancerVersion: 2 | 3;
};

export type SwapInput = {
    chainId: number;
    paths: Path[];
    swapKind: SwapKind;
};
export interface SwapBase {
    chainId: number;
    isBatchSwap: boolean;
    paths: PathWithAmount[];
    swapKind: SwapKind;
    swaps:
        | BatchSwapStep[]
        | SingleSwap
        | SingleTokenExactIn
        | SingleTokenExactOut
        | SwapPathExactAmountIn[]
        | SwapPathExactAmountOut[];
    quote: TokenAmount;
    inputAmount: TokenAmount;
    outputAmount: TokenAmount;
    query(
        rpcUrl?: string,
        block?: bigint,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput>;
    queryCallData(): string;
    buildCall(swapCall: SwapCallBuildV3 | SwapCallBuildV2): SwapBuildOutputBase;
}

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

export type CallInputBase = {
    deadline: bigint;
    slippage: Slippage;
    wethIsEth: boolean;
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput;
};

export type SwapCallInput = CallInputBase | CallInputV2;
