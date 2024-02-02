import {
    MAX_UINT256,
    removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError,
} from '@/utils';
import { Token } from '../token';
import { RemoveLiquidityAmounts } from '../types';
import { getAmounts } from '../utils';
import {
    RemoveLiquidityCall,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from './types';

export const getAmountsQuery = (
    tokens: Token[],
    input: RemoveLiquidityInput,
): RemoveLiquidityAmounts => {
    switch (input.kind) {
        case RemoveLiquidityKind.Unbalanced:
            return {
                minAmountsOut: getAmounts(tokens, input.amountsOut),
                tokenOutIndex: undefined,
                maxBptAmountIn: MAX_UINT256,
            };
        case RemoveLiquidityKind.SingleTokenExactOut:
            return {
                minAmountsOut: getAmounts(tokens, [input.amountOut]),
                tokenOutIndex: tokens.findIndex((t) =>
                    t.isSameAddress(input.amountOut.address),
                ),
                maxBptAmountIn: MAX_UINT256,
            };
        case RemoveLiquidityKind.SingleTokenExactIn:
            return {
                minAmountsOut: Array(tokens.length).fill(0n),
                tokenOutIndex: tokens.findIndex((t) =>
                    t.isSameAddress(input.tokenOut),
                ),
                maxBptAmountIn: input.bptIn.rawAmount,
            };
        case RemoveLiquidityKind.Proportional:
        case RemoveLiquidityKind.Recovery:
            return {
                minAmountsOut: Array(tokens.length).fill(0n),
                tokenOutIndex: undefined,
                maxBptAmountIn: input.bptIn.rawAmount,
            };
    }
};

export const getAmountsCall = (
    input: RemoveLiquidityCall,
): RemoveLiquidityAmounts => {
    switch (input.removeLiquidityKind) {
        case RemoveLiquidityKind.Unbalanced:
        case RemoveLiquidityKind.SingleTokenExactOut:
            return {
                minAmountsOut: input.amountsOut.map((a) => a.amount),
                tokenOutIndex: input.tokenOutIndex,
                maxBptAmountIn: input.slippage.applyTo(input.bptIn.amount),
            };
        case RemoveLiquidityKind.SingleTokenExactIn:
            if (input.tokenOutIndex === undefined) {
                throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;
            }
            return {
                minAmountsOut: input.amountsOut.map((a) =>
                    input.slippage.removeFrom(a.amount),
                ),
                tokenOutIndex: input.tokenOutIndex,
                maxBptAmountIn: input.bptIn.amount,
            };
        case RemoveLiquidityKind.Proportional:
        case RemoveLiquidityKind.Recovery:
            return {
                minAmountsOut: input.amountsOut.map((a) =>
                    input.slippage.removeFrom(a.amount),
                ),
                tokenOutIndex: input.tokenOutIndex,
                maxBptAmountIn: input.bptIn.amount,
            };
    }
};
