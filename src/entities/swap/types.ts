import { TokenAmount } from '../tokenAmount';
import { MinimalToken, Slippage } from '../..';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../types';
import { PathWithAmount } from './pathWithAmount';
import { Address, Hex } from 'viem';
import { SwapCallBuildV2, SwapCallV2 } from './swapV2';
import {
    SingleTokenExactIn,
    SingleTokenExactOut,
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
    ): Promise<ExpectedExactIn | ExpectedExactOut>;
    queryCallData(): string;
    buildCall(swapCall: SwapCallBuild): SwapBuildOutputBase;
}

export type ExpectedBase = {
    swapKind: SwapKind;
    pathAmounts?: bigint[];
};

export type ExpectedExactIn = ExpectedBase & {
    swapKind: SwapKind.GivenIn;
    expectedAmountOut: TokenAmount;
};

export type ExpectedExactOut = ExpectedBase & {
    swapKind: SwapKind.GivenOut;
    expectedAmountIn: TokenAmount;
};

export type SwapCallBase = {
    deadline: bigint;
    slippage: Slippage;
    wethIsEth: boolean;
    expected: ExpectedExactIn | ExpectedExactOut;
};

export type SwapCall = SwapCallBase | SwapCallV2;

export type SwapCallBuildBase = {
    deadline: bigint;
    limitAmount: TokenAmount;
    pathLimits: bigint[] | undefined;
    wethIsEth: boolean;
};

export type SwapCallBuild = SwapCallBuildBase | SwapCallBuildV2;
