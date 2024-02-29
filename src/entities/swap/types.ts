import { TokenAmount } from '../tokenAmount';
import { MinimalToken, Slippage } from '../..';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../types';
import { PathWithAmount } from './pathWithAmount';
import { Address, Hex } from 'viem';
import {
    SwapCallBuildV2,
    SwapCallExactInV2,
    SwapCallExactOutV2,
} from './swapV2';
import { SingleTokenExactIn, SingleTokenExactOut } from './swapV3';

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
    vaultVersion: 2 | 3;
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
        | SingleTokenExactOut;
    quote: TokenAmount;
    inputAmount: TokenAmount;
    outputAmount: TokenAmount;
    query(rpcUrl?: string, block?: bigint): Promise<TokenAmount>;
    queryCallData(): string;
    buildCall(swapCall: SwapCallBuild): SwapBuildOutputBase;
}

export type SwapCallExactInBase = {
    deadline: bigint;
    slippage: Slippage;
    wethIsEth: boolean;
    expectedAmountOut: TokenAmount;
};

export type SwapCallExactOutBase = {
    deadline: bigint;
    slippage: Slippage;
    wethIsEth: boolean;
    expectedAmountIn: TokenAmount;
};

export type SwapCallExactIn = SwapCallExactInBase | SwapCallExactInV2;
export type SwapCallExactOut = SwapCallExactOutBase | SwapCallExactOutV2;

export type SwapCallBuildBase = {
    deadline: bigint;
    limitAmount: TokenAmount;
    wethIsEth: boolean;
};

export type SwapCallBuild = SwapCallBuildBase | SwapCallBuildV2;
