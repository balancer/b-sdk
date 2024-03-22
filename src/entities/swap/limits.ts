import { SwapKind } from '@/types';
import { Slippage } from '../slippage';
import { TokenAmount } from '../tokenAmount';
import { QueryOutputBase } from './types';

/**
 * Apply slippage to expectedAmount. GivenIn: Remove to give minOut. GivenOut: Add to give maxIn.
 * @param slippage
 * @param swapKind
 * @param expectedAmount
 * @returns
 */
export function getLimitAmount(
    slippage: Slippage,
    swapKind: SwapKind,
    expectedAmount: TokenAmount,
): TokenAmount {
    let limitAmount: bigint;
    if (swapKind === SwapKind.GivenIn) {
        limitAmount = slippage.applyTo(expectedAmount.amount, -1);
    } else {
        limitAmount = slippage.applyTo(expectedAmount.amount);
    }
    return TokenAmount.fromRawAmount(expectedAmount.token, limitAmount);
}

/**
 * Apply slippage to pathAmounts. GivenIn: Remove to give minOut. GivenOut: Add to give maxIn.
 * @param slippage
 * @param expected
 * @returns
 */
export function getPathLimits(
    slippage: Slippage,
    expected: QueryOutputBase,
    maxAmount: bigint,
): bigint[] | undefined {
    if (!expected.pathAmounts) return undefined;
    let pathAmounts: bigint[];
    let total = 0n;
    if (expected.swapKind === SwapKind.GivenIn) {
        pathAmounts = expected.pathAmounts.map((a) => {
            const limit = slippage.applyTo(a, -1);
            total = total + limit;
            return limit;
        });
    } else {
        pathAmounts = expected.pathAmounts.map((a) => {
            const limit = slippage.applyTo(a);
            total = total + limit;
            return limit;
        });
    }
    // Slippage can lead to rounding diff compared to total so this handles dust diff
    const diff = maxAmount - total;
    pathAmounts[0] = pathAmounts[0] + diff;
    return pathAmounts;
}
