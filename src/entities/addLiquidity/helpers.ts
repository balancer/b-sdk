import { MAX_UINT256, removeIndex } from '@/utils';
import { AddLiquidityAmounts, PoolState } from '../types';
import { getAmounts, getSortedTokens } from '../utils';
import {
    AddLiquidityBaseBuildCallInput,
    AddLiquidityInput,
    AddLiquidityKind,
} from './types';
import { getBptAmountFromReferenceAmount } from '../utils/addLiquidityProportionalHelpers';

export const getAmountsQuery = async (
    input: AddLiquidityInput,
    poolState: PoolState,
    bptIndex = -1,
): Promise<AddLiquidityAmounts> => {
    const poolTokens = getSortedTokens(poolState.tokens, input.chainId);
    switch (input.kind) {
        case AddLiquidityKind.Unbalanced: {
            const maxAmountsIn = getAmounts(poolTokens, input.amountsIn);
            return {
                minimumBpt: 0n,
                maxAmountsIn,
                tokenInIndex: undefined,
                maxAmountsInWithoutBpt: removeIndex(maxAmountsIn, bptIndex),
            };
        }
        case AddLiquidityKind.SingleToken: {
            const tokenInIndex = poolTokens
                .filter((_, index) => index !== bptIndex) // Need to remove Bpt
                .findIndex((t) => t.isSameAddress(input.tokenIn));
            if (tokenInIndex === -1)
                throw Error("Can't find index of SingleToken");
            const maxAmountsIn = Array(poolTokens.length).fill(0n);
            maxAmountsIn[tokenInIndex] = MAX_UINT256;
            return {
                minimumBpt: input.bptOut.rawAmount,
                maxAmountsIn,
                tokenInIndex,
                maxAmountsInWithoutBpt: removeIndex(maxAmountsIn, bptIndex),
            };
        }
        case AddLiquidityKind.Proportional: {
            const maxAmountsIn = Array(poolTokens.length).fill(MAX_UINT256);
            const bptAmount = await getBptAmountFromReferenceAmount(
                input,
                poolState,
            );
            return {
                minimumBpt: bptAmount.rawAmount,
                maxAmountsIn,
                tokenInIndex: undefined,
                maxAmountsInWithoutBpt: removeIndex(maxAmountsIn, bptIndex),
            };
        }
    }
};

export const getAmountsCall = (
    input: AddLiquidityBaseBuildCallInput,
    bptIndex = -1,
): AddLiquidityAmounts => {
    switch (input.addLiquidityKind) {
        case AddLiquidityKind.Unbalanced: {
            const minimumBpt = input.slippage.applyTo(input.bptOut.amount, -1);
            const maxAmountsIn = input.amountsIn.map((a) => a.amount);
            return {
                minimumBpt,
                maxAmountsIn,
                tokenInIndex: input.tokenInIndex,
                maxAmountsInWithoutBpt: removeIndex(maxAmountsIn, bptIndex),
            };
        }
        case AddLiquidityKind.SingleToken:
        case AddLiquidityKind.Proportional: {
            const maxAmountsIn = input.amountsIn.map((a) =>
                input.slippage.applyTo(a.amount),
            );
            return {
                minimumBpt: input.bptOut.amount,
                maxAmountsIn,
                tokenInIndex: input.tokenInIndex,
                maxAmountsInWithoutBpt: removeIndex(maxAmountsIn, bptIndex),
            };
        }
    }
};
