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

export type SwapPathExactAmountIn = {
    tokenIn: Address;
    // for each step:
    // if tokenIn == pool use removeLiquidity SINGLE_TOKEN_EXACT_IN
    // if tokenOut == pool use addLiquidity UNBALANCED
    steps: SwapPathStep[];
    exactAmountIn: bigint;
};
