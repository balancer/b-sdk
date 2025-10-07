import { MAX_UINT256, missingParameterError } from '@/utils';
import { BaseToken } from '../baseToken';
import { RemoveLiquidityAmounts } from '../types';
import { getAmounts } from '../utils';
import {
    RemoveLiquidityBuildCallInput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from './types';

export const getAmountsQuery = (
    tokens: BaseToken[],
    input: RemoveLiquidityInput,
    bptIndex = -1,
): RemoveLiquidityAmounts => {
    switch (input.kind) {
        case RemoveLiquidityKind.Unbalanced:
            return {
                minAmountsOut: getAmounts(tokens, input.amountsOut),
                tokenOutIndex: undefined,
                maxBptAmountIn: MAX_UINT256, // maxAmountIn set to max when querying
            };
        case RemoveLiquidityKind.SingleTokenExactOut:
            return {
                minAmountsOut: getAmounts(tokens, [input.amountOut]),
                tokenOutIndex: tokens
                    .filter((_, index) => index !== bptIndex)
                    .findIndex((t) => t.isSameAddress(input.amountOut.address)),
                maxBptAmountIn: MAX_UINT256, // maxAmountIn set to max when querying
            };
        case RemoveLiquidityKind.SingleTokenExactIn:
            return {
                minAmountsOut: Array(tokens.length).fill(1n), // minAmountsOut set to 1 wei when querying
                tokenOutIndex: tokens
                    .filter((_, index) => index !== bptIndex)
                    .findIndex((t) => t.isSameAddress(input.tokenOut)),
                maxBptAmountIn: input.bptIn.rawAmount,
            };
        case RemoveLiquidityKind.Proportional:
            return {
                minAmountsOut: Array(tokens.length).fill(1n), // minAmountsOut set to 1 wei when querying
                tokenOutIndex: undefined,
                maxBptAmountIn: input.bptIn.rawAmount,
            };
        case RemoveLiquidityKind.Recovery:
            return {
                minAmountsOut: Array(tokens.length).fill(1n), // minAmountsOut set to 1 wei when querying
                tokenOutIndex: undefined,
                maxBptAmountIn: input.bptIn.rawAmount,
            };
    }
};

export const getAmountsCall = (
    input: RemoveLiquidityBuildCallInput,
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
                throw missingParameterError(
                    'Remove Liquidity SingleTokenExactIn',
                    'tokenOutIndex',
                    input.protocolVersion,
                );
            }
            return {
                minAmountsOut: input.amountsOut.map((a) =>
                    input.slippage.applyTo(a.amount, -1),
                ),
                tokenOutIndex: input.tokenOutIndex,
                maxBptAmountIn: input.bptIn.amount,
            };
        case RemoveLiquidityKind.Proportional:
        case RemoveLiquidityKind.Recovery: {
            return {
                minAmountsOut: input.amountsOut.map((a) =>
                    input.slippage.applyTo(a.amount, -1),
                ),
                tokenOutIndex:
                    'tokenOutIndex' in input ? input.tokenOutIndex : undefined,
                maxBptAmountIn: input.bptIn.amount,
            };
        }
    }
};
