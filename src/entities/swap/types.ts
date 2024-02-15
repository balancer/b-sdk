import { TokenAmount } from '../tokenAmount';
import { MinimalToken, Slippage } from '../..';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../types';
import { PathWithAmount } from './pathWithAmount';
import { Address, Hex } from 'viem';

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

export interface SwapBase {
    chainId: number;
    isBatchSwap: boolean;
    paths: PathWithAmount[];
    assets: Address[];
    swapKind: SwapKind;
    swaps: BatchSwapStep[] | SingleSwap;
    quote: TokenAmount;
    inputAmount: TokenAmount;
    outputAmount: TokenAmount;
    query(rpcUrl?: string, block?: bigint): Promise<TokenAmount>;
    queryCallData(): string;
    buildCall(swapCall: SwapCallBuild): SwapBuildOutputBase;
}

type SwapCallBase = {
    deadline: bigint;
    sender: Address;
    recipient: Address;
};

export type SwapCallExactIn = SwapCallBase & {
    slippage: Slippage;
    expectedAmountOut: TokenAmount;
};

export type SwapCallExactOut = SwapCallBase & {
    slippage: Slippage;
    expectedAmountIn: TokenAmount;
};

export type SwapCallBuild = SwapCallBase & {
    limitAmount: TokenAmount;
};
