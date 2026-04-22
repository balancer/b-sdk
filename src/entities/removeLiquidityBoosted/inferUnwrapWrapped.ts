import { Address } from 'viem';

import { PoolTokenWithUnderlying } from '@/entities/types';
import { isSameAddress, inputValidationError } from '@/utils';

/**
 * Derives the per-slot `unwrapWrapped` boolean array for a boosted proportional
 * remove-liquidity query.
 *
 * @param poolTokens - Pool tokens (any order; sorted internally by `index`).
 * @param tokensOut  - One address per pool slot, aligned with sorted `index`.
 *                    Each entry must be either the pool token address (→ false)
 *                    or, for ERC4626 slots, the underlying address (→ true).
 *
 * This is a pure function: all validation that is input-shape dependent
 * (e.g. length mismatch) is handled by the caller via InputValidator before
 * this helper is invoked.
 */
export function inferUnwrapWrapped(
    poolTokens: PoolTokenWithUnderlying[],
    tokensOut: Address[],
): boolean[] {
    const sorted = [...poolTokens].sort((a, b) => a.index - b.index);

    return sorted.map((pt, i) => {
        const desired = tokensOut[i];

        if (isSameAddress(desired, pt.address)) {
            return false;
        }

        if (
            pt.underlyingToken !== null &&
            isSameAddress(desired, pt.underlyingToken.address)
        ) {
            return true;
        }

        const underlyingHint = pt.underlyingToken
            ? ` or its underlying ${pt.underlyingToken.address}`
            : '';
        throw inputValidationError(
            'Remove Liquidity Boosted',
            `tokensOut[${i}] (${desired}) is not valid for pool token index ${i}: expected pool token ${pt.address}${underlyingHint}`,
        );
    });
}
