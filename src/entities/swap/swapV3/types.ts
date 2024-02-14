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
