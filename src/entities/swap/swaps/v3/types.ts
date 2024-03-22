import { TokenAmount } from '@/entities/tokenAmount';
import { Address } from 'viem';

type SingleStep = {
    pool: Address;
    tokenIn: Address;
    tokenOut: Address;
};

export type SingleTokenExactIn = SingleStep & {
    exactAmountIn: bigint;
};

export type SingleTokenExactOut = SingleStep & {
    exactAmountOut: bigint;
};

export type SwapPathStep = {
    pool: Address;
    tokenOut: Address;
};

type SwapPathBase = {
    tokenIn: Address;
    steps: SwapPathStep[];
};

export type SwapPathExactAmountIn = SwapPathBase & {
    // for each step:
    // if tokenIn == pool use removeLiquidity SINGLE_TOKEN_EXACT_IN
    // if tokenOut == pool use addLiquidity UNBALANCED
    exactAmountIn: bigint;
};

export type SwapPathExactAmountInWithLimit = SwapPathExactAmountIn & {
    minAmountOut: bigint;
};

export type SwapPathExactAmountOut = SwapPathBase & {
    // for each step:
    // if tokenIn == pool use removeLiquidity SINGLE_TOKEN_EXACT_OUT
    // if tokenOut == pool use addLiquidity SINGLE_TOKEN_EXACT_OUT
    exactAmountOut: bigint;
};

export type SwapPathExactAmountOutWithLimit = SwapPathExactAmountOut & {
    maxAmountIn: bigint;
};

export type SwapBuildCallInputV3 = {
    deadline: bigint;
    limitAmount: TokenAmount;
    wethIsEth: boolean;
    pathLimits: bigint[] | undefined;
};
