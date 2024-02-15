import { TokenAmount } from '../tokenAmount';
import { MinimalToken, Slippage } from '../..';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../types';
import { PathWithAmount } from './pathWithAmount';
import { Address, Hex } from 'viem';
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
    balancerVersion: 2 | 3;
};

export type SwapInputBase = {
    chainId: number;
    paths: Path[];
    swapKind: SwapKind;
};

export type SwapInputV2 = SwapInputBase & {
    sender: Address;
    recipient: Address;
};

export type SwapInputV3 = SwapInputBase & {
    wethIsEth: boolean;
};

export type SwapInput = SwapInputV2 | SwapInputV3;

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

type BaseSwapCall = {
    deadline: bigint;
};

export type SwapCallExactIn = BaseSwapCall & {
    slippage: Slippage;
    expectedAmountOut: TokenAmount;
};

export type SwapCallExactOut = BaseSwapCall & {
    slippage: Slippage;
    expectedAmountIn: TokenAmount;
};

export type SwapCallBuild = BaseSwapCall & {
    limitAmount: TokenAmount;
};
