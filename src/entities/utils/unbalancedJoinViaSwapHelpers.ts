import { Address, parseUnits } from 'viem';
import { InputAmount } from '@/types';
import { HumanAmount } from '@/data';
import {
    inputValidationError,
    isSameAddress,
    MathSol,
    WAD,
    SDKError,
} from '@/utils';
import { AddLiquidityProportionalInput } from '../addLiquidity/types';
import {
    PoolState,
    PoolStateWithUnderlyingBalances,
    PoolStateWithUnderlyings,
} from '../types';
import { getPoolStateWithBalancesV2 } from './getPoolStateWithBalancesV2';
import {
    getBoostedPoolStateWithBalancesV3,
    getPoolStateWithBalancesV3,
} from './getPoolStateWithBalancesV3';
import { AddLiquidityBoostedProportionalInput } from '../addLiquidityBoosted/types';

import { calculateProportionalAmounts } from './proportionalAmountsHelpers';

// Minimum raw exact-token amount we want the router's internal swap to use.
// This is intended to be large enough that, after scaling to 18 decimals and
// applying token rates, the Vault's _ensureValidSwapAmount check will not
// revert with TradeAmountTooSmall for typical tokens.
const DEFAULT_MIN_SWAP_AMOUNT_RAW = 1_000_000n;

// Conservative default swap fee used when estimating the minimum internal swap
// size required to avoid TradeAmountTooSmall. Expressed as a WAD (1e18) fixed
// point, so 1% = 0.01 * 1e18 = 1e16.
const DEFAULT_SWAP_FEE_PERCENTAGE_WAD = 10_000_000_000_000_000n; // 1%

/**
 * Unbalanced join with two tokens and a user-provided maxAdjustableAmount.
 *
 * referenceAmount: exact token the user cares about (e.g. WETH)
 * maxAdjustableAmountRaw: user’s max budget (raw wei) for the other token.
 *
 * This helper also ensures that, for the scaled BPT target, the implied
 * EXACT_IN correction swap for the exact token is not too small, by using
 * a built-in DEFAULT_MIN_SWAP_AMOUNT_RAW threshold.
 */
export function calculateBptAmountFromUnbalancedJoinTwoTokensGivenIn(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    referenceAmount: InputAmount,
    maxAdjustableAmountRaw: bigint,
    minSwapAmountRaw: bigint = DEFAULT_MIN_SWAP_AMOUNT_RAW,
): {
    tokenAmounts: InputAmount[];
    bptAmount: InputAmount;
} {
    // validate that input amount is relative to a token in the pool
    const referenceTokenIndex = pool.tokens.findIndex(
        (t) =>
            t.address.toLowerCase() === referenceAmount.address.toLowerCase(),
    );
    if (referenceTokenIndex === -1) {
        throw inputValidationError(
            'Calculate Proportional Amounts',
            `Reference amount token ${referenceAmount.address} must be relative to a token in the pool`,
        );
    }
    if (pool.tokens.length !== 2) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokens',
            'Pool must have exactly 2 tokens',
        );
    }

    // First, compute the purely proportional join for the full reference amount.
    const {
        tokenAmounts: proportionalTokenAmounts,
        bptAmount: proportionalBptAmount,
    } = calculateProportionalAmounts(pool, referenceAmount);

    const adjustableTokenIndex = referenceTokenIndex === 0 ? 1 : 0;

    const proportionalAdjustableRaw =
        proportionalTokenAmounts[adjustableTokenIndex].rawAmount;
    const exactRaw = referenceAmount.rawAmount;
    const proportionalExactRaw =
        proportionalTokenAmounts[referenceTokenIndex].rawAmount;

    // If proportional amounts already respect both:
    //   - adjustable <= maxAdjustableAmountRaw (if provided)
    //   - correction swap delta >= minSwapAmountRaw
    // we can use the proportional result directly.
    const initialDelta =
        proportionalExactRaw >= exactRaw ? 0n : exactRaw - proportionalExactRaw;

    const adjustableWithinBudget =
        maxAdjustableAmountRaw <= 0n ||
        proportionalAdjustableRaw === 0n ||
        proportionalAdjustableRaw <= maxAdjustableAmountRaw;

    const swapBigEnough =
        initialDelta >= minSwapAmountRaw || proportionalExactRaw >= exactRaw;

    if (adjustableWithinBudget && swapBigEnough) {
        return {
            tokenAmounts: proportionalTokenAmounts,
            bptAmount: proportionalBptAmount,
        };
    }

    // If even the full exactRaw is not big enough to ever reach minSwapAmountRaw,
    // the requested join is too small for a meaningful correction swap.
    if (exactRaw <= minSwapAmountRaw) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokens',
            'Exact token amount is too small to satisfy minimum swap amount',
        );
    }

    if (proportionalExactRaw === 0n) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokens',
            'Proportional exact amount is zero; cannot scale reference',
        );
    }

    // ---------------------------------------------------------------------------
    // Scale down the reference amount so that:
    //
    // 1) proportional adjustable ≲ maxAdjustableAmountRaw, and
    // 2) the implied EXACT_IN correction swap delta is ≥ minSwapAmountRaw.
    //
    // For proportional joins (small size), token amounts scale with referenceRaw:
    //
    //   E0 = proportionalExactRaw  for referenceRaw = exactRaw
    //   A0 = proportionalAdjustableRaw
    //
    //   E'(ref') ≈ E0 * (ref' / exactRaw)
    //   A'(ref') ≈ A0 * (ref' / exactRaw)
    //
    // Budget constraint:
    //   A'(ref') <= maxAdjustableAmountRaw
    //   => ref' <= exactRaw * maxAdjustableAmountRaw / A0
    //
    // Min-swap constraint:
    //   δ = exactRaw - E'(ref') >= minSwapAmountRaw
    //   => E'(ref') <= exactRaw - minSwapAmountRaw
    //   => ref' <= exactRaw * (exactRaw - minSwapAmountRaw) / E0
    //
    // We take the minimum of these upper bounds (and referenceRaw) as our
    // scaled referenceRaw'.
    // ---------------------------------------------------------------------------

    // Upper bound from adjustable budget
    let refBoundBudget = referenceAmount.rawAmount;
    if (maxAdjustableAmountRaw > 0n && proportionalAdjustableRaw > 0n) {
        refBoundBudget =
            (referenceAmount.rawAmount * maxAdjustableAmountRaw) /
            proportionalAdjustableRaw;
    }

    // Upper bound from min swap size (only if we are in the EXACT_IN correction branch)
    let refBoundMinSwap = referenceAmount.rawAmount;
    if (proportionalExactRaw < exactRaw) {
        const targetProportionalExactRaw = exactRaw - minSwapAmountRaw;
        refBoundMinSwap =
            (targetProportionalExactRaw * referenceAmount.rawAmount) /
            proportionalExactRaw;
    }

    // Take the minimum of:
    //   - original reference
    //   - budget bound
    //   - min-swap bound
    let newReferenceRaw = referenceAmount.rawAmount;
    newReferenceRaw =
        newReferenceRaw < refBoundBudget ? newReferenceRaw : refBoundBudget;
    newReferenceRaw =
        newReferenceRaw < refBoundMinSwap ? newReferenceRaw : refBoundMinSwap;

    // Guard against pathological cases
    if (newReferenceRaw <= 0n) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokens',
            'Scaled reference amount became zero or negative',
        );
    }
    if (newReferenceRaw >= referenceAmount.rawAmount) {
        // If scaling didn't actually reduce the reference, just return proportional.
        return {
            tokenAmounts: proportionalTokenAmounts,
            bptAmount: proportionalBptAmount,
        };
    }

    const newReferenceAmount: InputAmount = {
        address: referenceAmount.address,
        decimals: referenceAmount.decimals,
        rawAmount: newReferenceRaw,
    };

    const { tokenAmounts: scaledTokenAmounts, bptAmount: scaledBptAmount } =
        calculateProportionalAmounts(pool, newReferenceAmount);

    return {
        tokenAmounts: scaledTokenAmounts,
        bptAmount: scaledBptAmount,
    };
}

/**
 * Variant of the GivenIn helper that tries to minimize the adjustable token in
 * by searching over smaller internal proportional references (equivalently,
 * smaller BPT targets) while keeping the external exactAmount fixed. It still
 * must satisfy:
 *  - correction swap delta >= minSwapAmountRaw, and
 *  - adjustable <= maxAdjustableAmountRaw (if provided).
 *
 * This uses repeated calls to calculateProportionalAmounts and assumes
 * approximate linearity of proportional amounts with respect to the reference
 * amount. It is intended as an "aggressive" mode and may deviate further from
 * the proportional join than strictly necessary.
 */
export function calculateBptAmountFromUnbalancedJoinTwoTokensExactInMinAdjustable(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    referenceAmount: InputAmount,
    maxAdjustableAmountRaw: bigint,
    minSwapAmountRaw: bigint = DEFAULT_MIN_SWAP_AMOUNT_RAW,
): {
    tokenAmounts: InputAmount[];
    bptAmount: InputAmount;
} {
    const referenceTokenIndex = pool.tokens.findIndex(
        (t) =>
            t.address.toLowerCase() === referenceAmount.address.toLowerCase(),
    );
    if (referenceTokenIndex === -1) {
        throw inputValidationError(
            'Calculate Proportional Amounts',
            `Reference amount token ${referenceAmount.address} must be relative to a token in the pool`,
        );
    }
    if (pool.tokens.length !== 2) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensExactInMinAdjustable',
            'Pool must have exactly 2 tokens',
        );
    }

    const adjustableTokenIndex = referenceTokenIndex === 0 ? 1 : 0;

    // Approximate constant price between exact and adjustable tokens from the
    // current pool balances. We assume:
    //
    //   deltaExact / balanceExact ≈ swapOut / balanceAdjustable
    //
    // which gives:
    //
    //   swapOutEst ≈ deltaExact * balanceAdjustable / balanceExact
    //
    // We use this to enforce that the estimated correction swap output does not
    // exceed the proportional adjustable amount for a given reference, which
    // would otherwise cause the router's
    //
    //   amountsIn[adjustable] -= swapAmountOut
    //
    // accounting to underflow.
    const exactToken = pool.tokens[referenceTokenIndex];
    const adjustableToken = pool.tokens[adjustableTokenIndex];

    const exactBalanceRaw = parseUnits(exactToken.balance, exactToken.decimals);
    const adjustableBalanceRaw = parseUnits(
        adjustableToken.balance,
        adjustableToken.decimals,
    );

    if (exactBalanceRaw === 0n || adjustableBalanceRaw === 0n) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensExactInMinAdjustable',
            'Pool token balance is zero; cannot estimate constant price for aggressive path',
        );
    }

    const priceWad = (adjustableBalanceRaw * WAD) / exactBalanceRaw;

    const exactRaw = referenceAmount.rawAmount;
    if (exactRaw <= minSwapAmountRaw) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensExactInMinAdjustable',
            'Exact token amount is too small to satisfy minimum swap amount',
        );
    }

    // Search the full range of internal proportional references from 1 wei up to
    // the user's exact amount. Smaller references correspond to smaller BPT
    // targets and, typically, smaller proportional adjustable amounts. The search
    // will enforce min-swap and budget constraints when deciding which
    // candidates are valid.
    let left = 1n;
    let right = exactRaw;

    let bestTokenAmounts: InputAmount[] | null = null;
    let bestBptAmount: InputAmount | null = null;
    let bestReferenceRaw: bigint | null = null;
    let iterations = 0;

    while (left <= right) {
        iterations += 1;
        const mid = (left + right) / 2n;

        const midReference: InputAmount = {
            address: referenceAmount.address,
            decimals: referenceAmount.decimals,
            rawAmount: mid,
        };

        const { tokenAmounts: midTokenAmounts, bptAmount: midBptAmount } =
            calculateProportionalAmounts(pool, midReference);

        const midBptRaw = midBptAmount.rawAmount;
        // Enforce a minimum BPT out and minimum token amounts so that the
        // addLiquidity call does not trip the Vault's _ensureValidTradeAmount/
        // _ensureValidSwapAmount guards, which enforce a minimum scaled18 trade
        // amount (configured via _MINIMUM_TRADE_AMOUNT). DEFAULT_MIN_SWAP_AMOUNT_RAW
        // is set to 1e6, matching the default _MINIMUM_TRADE_AMOUNT used in tests.
        const minTradeRaw = DEFAULT_MIN_SWAP_AMOUNT_RAW;
        if (midBptRaw < minTradeRaw) {
            // Reference is too small: proportional BPT out would be below the Vault's
            // minimum trade size, so increase the reference.
            left = mid + 1n;
            continue;
        }

        const tokensBigEnough = midTokenAmounts.every(
            (t) => t.rawAmount === 0n || t.rawAmount >= minTradeRaw,
        );
        if (!tokensBigEnough) {
            // At least one proportional token amount would be below the Vault's
            // minimum trade threshold; increase the reference.
            left = mid + 1n;
            continue;
        }

        const midAdjustableRaw =
            midTokenAmounts[adjustableTokenIndex].rawAmount;
        const midExactRaw = midTokenAmounts[referenceTokenIndex].rawAmount;

        const delta = midExactRaw >= exactRaw ? 0n : exactRaw - midExactRaw;

        // needs to be checked to ensure Vault does not revert with TradeAmountTooSmall
        // swapAmount in needs to be > MINIMUM_TRADE_AMOUNT * (1 + swapFeePercentageWad)
        // Because the vault substracts the swapFeeAmount from the swapAmount in
        const swapBigEnough =
            delta >= minSwapAmountRaw || midExactRaw >= exactRaw;

        // Under the constant-price model, estimate the correction swap output in
        // terms of the adjustable token and require that it does not exceed the
        // proportional adjustable leg for this reference. This avoids selecting
        // BPT targets where the router would need to subtract more adjustable from
        // the provisional add than was actually contributed.
        let swapWithinAdjustableLeg = true;
        let swapOutEstRaw: bigint | null = null;
        if (delta > 0n && midAdjustableRaw > 0n) {
            swapOutEstRaw = (delta * priceWad) / WAD;
            swapWithinAdjustableLeg = swapOutEstRaw <= midAdjustableRaw;
        }

        const adjustableWithinBudget =
            midAdjustableRaw <= maxAdjustableAmountRaw;

        // Per-iteration debug log to understand how the constraints evolve and why
        // a given candidate is accepted or rejected. This can be commented out or
        // guarded by an environment flag in production.
        // eslint-disable-next-line no-console
        console.debug('[UnbalancedJoinViaSwap:GivenInMinAdjustable:iter]', {
            iterations,
            left: left.toString(),
            right: right.toString(),
            mid: mid.toString(),
            midBptRaw: midBptRaw.toString(),
            midExactRaw: midExactRaw.toString(),
            midAdjustableRaw: midAdjustableRaw.toString(),
            delta: delta.toString(),
            swapOutEstRaw:
                swapOutEstRaw !== null ? swapOutEstRaw.toString() : '0',
            swapBigEnough,
            adjustableWithinBudget,
            swapWithinAdjustableLeg,
        });

        if (
            !swapBigEnough ||
            !adjustableWithinBudget ||
            !swapWithinAdjustableLeg
        ) {
            // Too close to proportional (swap too small), above budget, or the
            // estimated correction swap would consume more adjustable than the
            // proportional leg provides: decrease reference to move further away
            // and reduce adjustable.
            right = mid - 1n;
            continue;
        }

        // Candidate is valid. Since we are minimizing adjustable, and adjustable
        // decreases with smaller reference, keep searching to the left.
        bestTokenAmounts = midTokenAmounts;
        bestBptAmount = midBptAmount;
        bestReferenceRaw = mid;
        right = mid - 1n;
    }

    if (!bestTokenAmounts || !bestBptAmount) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensExactInMinAdjustable',
            'Could not find a reference amount that satisfies min swap and budget constraints',
        );
    }

    if (bestReferenceRaw === null) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensExactInMinAdjustable',
            'Internal error: best reference amount not set',
        );
    }

    // Debug summary of the binary search. This is intended as a development aid
    // and can be commented out or guarded by an environment flag if needed.
    const bestAdjustableRaw = bestTokenAmounts[adjustableTokenIndex].rawAmount;
    const bestBptRaw = bestBptAmount.rawAmount;
    const bestExactRaw = bestTokenAmounts[referenceTokenIndex].rawAmount;
    const bestDeltaRaw =
        bestExactRaw >= exactRaw ? 0n : exactRaw - bestExactRaw;

    let bestSwapOutEstRaw: bigint | null = null;
    if (bestDeltaRaw > 0n) {
        bestSwapOutEstRaw = (bestDeltaRaw * priceWad) / WAD;
    }

    const minTradeRaw = DEFAULT_MIN_SWAP_AMOUNT_RAW;
    const bestSwapBigEnough =
        bestDeltaRaw >= minSwapAmountRaw || bestExactRaw >= exactRaw;
    const bestAdjustableWithinBudget =
        bestAdjustableRaw <= maxAdjustableAmountRaw;
    const bestSwapWithinAdjustableLeg =
        bestDeltaRaw === 0n ||
        (bestSwapOutEstRaw !== null && bestSwapOutEstRaw <= bestAdjustableRaw);

    // eslint-disable-next-line no-console
    console.debug('[UnbalancedJoinViaSwap:GivenInMinAdjustable]', {
        iterations,
        exactRaw: exactRaw.toString(),
        maxAdjustableAmountRaw: maxAdjustableAmountRaw.toString(),
        minSwapAmountRaw: minSwapAmountRaw.toString(),
        exactBalanceRaw: exactBalanceRaw.toString(),
        adjustableBalanceRaw: adjustableBalanceRaw.toString(),
        priceWad: priceWad.toString(),
        bestReferenceRaw: bestReferenceRaw.toString(),
        bestExactRaw: bestExactRaw.toString(),
        bestDeltaRaw: bestDeltaRaw.toString(),
        bestSwapOutEstRaw:
            bestSwapOutEstRaw !== null ? bestSwapOutEstRaw.toString() : '0',
        bestAdjustableRaw: bestAdjustableRaw.toString(),
        bestBptRaw: bestBptRaw.toString(),
        bestSwapBigEnough,
        bestAdjustableWithinBudget,
        bestSwapWithinAdjustableLeg,
    });

    return {
        tokenAmounts: bestTokenAmounts,
        bptAmount: bestBptAmount,
    };
}

export function calculateBptAmountFromUnbalancedJoinTwoTokensGivenOut(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    referenceAmount: InputAmount,
    maxAdjustableAmountRaw: bigint,
    minSwapAmountRaw: bigint = DEFAULT_MIN_SWAP_AMOUNT_RAW,
): {
    tokenAmounts: InputAmount[];
    bptAmount: InputAmount;
} {
    // validate that input amount is relative to a token in the pool
    const referenceTokenIndex = pool.tokens.findIndex(
        (t) =>
            t.address.toLowerCase() === referenceAmount.address.toLowerCase(),
    );
    if (referenceTokenIndex === -1) {
        throw inputValidationError(
            'Calculate Proportional Amounts',
            `Reference amount token ${referenceAmount.address} must be relative to a token in the pool`,
        );
    }
    if (pool.tokens.length !== 2) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensGivenOut',
            'Pool must have exactly 2 tokens',
        );
    }

    // Proportional join for the original reference amount (usually exactAmountIn).
    const {
        tokenAmounts: proportionalTokenAmounts,
        bptAmount: proportionalBptAmount,
    } = calculateProportionalAmounts(pool, referenceAmount);

    const adjustableTokenIndex = referenceTokenIndex === 0 ? 1 : 0;

    const proportionalAdjustableRaw =
        proportionalTokenAmounts[adjustableTokenIndex].rawAmount;
    const baseRefRaw = referenceAmount.rawAmount;
    const exactRaw = referenceAmount.rawAmount;
    const proportionalExactRaw =
        proportionalTokenAmounts[referenceTokenIndex].rawAmount;

    if (proportionalExactRaw === 0n) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensGivenOut',
            'Proportional exact amount is zero; cannot scale reference',
        );
    }

    // Initial EXACT_OUT delta (if any).
    // The amount that can be used for the correction swap
    const initialDeltaOut =
        proportionalExactRaw > exactRaw ? proportionalExactRaw - exactRaw : 0n;

    // proportionalAdjustableRaw was calculated in the proportional join helper
    // maxAdjustableAmountRaw is the user's max budget for the other token.
    // it is within the budget if the proportionalAdjustableRaw is less than or equal to the maxAdjustableAmountRaw
    const adjustableWithinBudget =
        maxAdjustableAmountRaw <= 0n ||
        proportionalAdjustableRaw === 0n ||
        proportionalAdjustableRaw <= maxAdjustableAmountRaw;

    const swapBigEnough = initialDeltaOut >= minSwapAmountRaw;

    // If we're already in the GIVEN_OUT region with a large enough swap and
    // within adjustable budget, just use the proportional result.
    // this is unlikely to happen because the proportional amounts helper is accurate
    if (adjustableWithinBudget && swapBigEnough) {
        return {
            tokenAmounts: proportionalTokenAmounts,
            bptAmount: proportionalBptAmount,
        };
    }

    // ---- BELOW is the updated exactBptOut calculation ----

    // this happens if using the values provided by the proportional join helper are
    // "too close to proportional"

    // ---------------------------------------------------------------------------
    // Scale UP the reference amount so that:
    //
    //   E'(ref') ≈ exactRaw + minSwapAmountRaw
    //
    // where:
    //   E0 = proportionalExactRaw  for referenceRaw = baseRefRaw
    //   E'(ref') ≈ E0 * (ref' / baseRefRaw)
    //
    // Solving for ref':
    //
    //   ref' = baseRefRaw * (exactRaw + minSwapAmountRaw) / E0
    //
    // This ensures:
    //   - proportional exact > exactRaw  (GIVEN_OUT branch),
    //   - swapAmountOut ≈ E'(ref') - exactRaw ≥ minSwapAmountRaw.
    // ---------------------------------------------------------------------------
    const targetExactOutRaw = exactRaw + minSwapAmountRaw;

    let newReferenceRaw =
        (baseRefRaw * targetExactOutRaw) / proportionalExactRaw;

    if (newReferenceRaw <= baseRefRaw) {
        // Guard: ensure we actually scale up for GIVEN_OUT testing.
        newReferenceRaw = baseRefRaw + 1n;
    }

    // Optional safety: enforce adjustable budget if provided.
    if (maxAdjustableAmountRaw > 0n && proportionalAdjustableRaw > 0n) {
        const newAdjustableRaw =
            (proportionalAdjustableRaw * newReferenceRaw) / baseRefRaw;
        if (newAdjustableRaw > maxAdjustableAmountRaw) {
            throw new SDKError(
                'UnbalancedJoinViaSwap',
                'calculateBptAmountFromUnbalancedJoinTwoTokensGivenOut',
                'Scaled reference exceeds maxAdjustableAmount budget',
            );
        }
    }

    if (proportionalAdjustableRaw > proportionalAdjustableRaw) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensGivenOut',
            'Scaled adjustable in is lower than initial the proportional adjustable amount',
        );
    }

    const newReferenceAmount: InputAmount = {
        address: referenceAmount.address,
        decimals: referenceAmount.decimals,
        rawAmount: newReferenceRaw,
    };

    const { tokenAmounts: scaledTokenAmounts, bptAmount: scaledBptAmount } =
        calculateProportionalAmounts(pool, newReferenceAmount);

    return {
        tokenAmounts: scaledTokenAmounts,
        bptAmount: scaledBptAmount,
    };
}

/**
 * Calculate the BPT amount for a given reference amount in a pool (rounded down).
 *
 * Note: this is used in the AddLiquidityProportional query scenario, where a non-bpt refenceAmount is provided and
 * the SDK needs to infer the corresponding bptOut. Rounding down favors leaving some dust behind instead of returning an amount
 * slightly higher than the referenceAmount provided, in order to prevent a revert in the add liquidity proportional transaction.
 * @param input
 * @param poolState
 * @returns
 */
/**
 * Wrapper used by the unbalanced-join-via-swap path when the user
 * provides a non-zero maxAdjustableAmount.
 * Aims to do a GivenIn Swap
 */
export const getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenIn =
    async (
        input: AddLiquidityProportionalInput & {
            maxAdjustableAmountRaw: bigint;
        },
        poolState: PoolState,
    ): Promise<InputAmount> => {
        let bptAmount: InputAmount;

        if (input.referenceAmount.address === poolState.address) {
            // This scenario should not be happening with the unbalanced join via swap Router
            throw new SDKError(
                'UnbalancedJoinViaSwap',
                'getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokens',
                'Reference amount token cannot be the same as pool address',
            );
        }

        const poolStateWithBalances = await getPoolStateWithBalancesV3(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { bptAmount: innerBpt } =
            calculateBptAmountFromUnbalancedJoinTwoTokensGivenIn(
                poolStateWithBalances,
                input.referenceAmount,
                input.maxAdjustableAmountRaw, // user-provided budget
                adjustMinSwapForFee(
                    DEFAULT_MIN_SWAP_AMOUNT_RAW,
                    DEFAULT_SWAP_FEE_PERCENTAGE_WAD,
                ),
            );

        bptAmount = innerBpt;
        return bptAmount;
    };

export const getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensExactInMinAdjustable =
    async (
        input: AddLiquidityProportionalInput & {
            maxAdjustableAmountRaw: bigint;
        },
        poolState: PoolState,
    ): Promise<InputAmount> => {
        let bptAmount: InputAmount;

        if (input.referenceAmount.address === poolState.address) {
            throw new SDKError(
                'UnbalancedJoinViaSwap',
                'getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensMinAdjustable',
                'Reference amount token cannot be the same as pool address',
            );
        }

        const poolStateWithBalances = await getPoolStateWithBalancesV3(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { bptAmount: innerBpt } =
            calculateBptAmountFromUnbalancedJoinTwoTokensExactInMinAdjustable(
                poolStateWithBalances,
                input.referenceAmount,
                input.maxAdjustableAmountRaw,
                adjustMinSwapForFee(
                    DEFAULT_MIN_SWAP_AMOUNT_RAW,
                    DEFAULT_SWAP_FEE_PERCENTAGE_WAD,
                ),
            );

        bptAmount = innerBpt;
        return bptAmount;
    };

export const getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenOut =
    async (
        input: AddLiquidityProportionalInput & {
            maxAdjustableAmountRaw: bigint;
        },
        poolState: PoolState,
    ): Promise<InputAmount> => {
        let bptAmount: InputAmount;

        if (input.referenceAmount.address === poolState.address) {
            // This scenario should not be happening with the unbalanced join via swap Router
            throw new SDKError(
                'UnbalancedJoinViaSwap',
                'getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokens',
                'Reference amount token cannot be the same as pool address',
            );
        }

        const poolStateWithBalances = await getPoolStateWithBalancesV3(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { bptAmount: innerBpt } =
            calculateBptAmountFromUnbalancedJoinTwoTokensGivenOut(
                poolStateWithBalances,
                input.referenceAmount,
                input.maxAdjustableAmountRaw, // user-provided budget
                adjustMinSwapForFee(
                    DEFAULT_MIN_SWAP_AMOUNT_RAW,
                    DEFAULT_SWAP_FEE_PERCENTAGE_WAD,
                ), // fee-adjusted min swap size to avoid TradeAmountTooSmall
            );

        bptAmount = innerBpt;
        return bptAmount;
    };

// swapFeePercentageWad is e.g. 1e16n for 1% (1% * 1e18)
function adjustMinSwapForFee(
    minSwapAmountRaw: bigint,
    swapFeePercentageWad: bigint,
): bigint {
    if (swapFeePercentageWad === 0n) return minSwapAmountRaw;

    const oneMinusFee = WAD - swapFeePercentageWad;
    // ceil(minSwapAmountRaw / (1 - fee))
    return MathSol.divUp(minSwapAmountRaw * WAD, oneMinusFee);
}
