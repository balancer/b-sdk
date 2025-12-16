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

export function calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    referenceAmount: InputAmount,
    maxAdjustableAmountRaw: bigint,
): {
    tokenAmounts: InputAmount[];
    bptAmount: InputAmount;
} {
    // Validate that the adjustable token (referenceAmount.address) is one of the pool tokens.
    const adjustableTokenIndex = pool.tokens.findIndex(
        (t) =>
            t.address.toLowerCase() === referenceAmount.address.toLowerCase(),
    );
    if (adjustableTokenIndex === -1) {
        throw inputValidationError(
            'Calculate Proportional Amounts',
            `Reference amount token ${referenceAmount.address} must be relative to a token in the pool`,
        );
    }
    if (pool.tokens.length !== 2) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount',
            'Pool must have exactly 2 tokens',
        );
    }

    // Use half of the user's adjustable budget as the proportional reference.
    const halfAdjustableRaw = maxAdjustableAmountRaw / 2n;
    if (halfAdjustableRaw === 0n) {
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount',
            'maxAdjustableAmountRaw is too small to derive a meaningful proportional reference',
        );
    }

    const halfReferenceAmount: InputAmount = {
        address: referenceAmount.address,
        decimals: referenceAmount.decimals,
        rawAmount: halfAdjustableRaw,
    };

    const { tokenAmounts, bptAmount } = calculateProportionalAmounts(
        pool,
        halfReferenceAmount,
    );

    // Optionally allow a small uplift on the proportional BPT estimate.
    // For now we keep this at +20% to use a bit more of the user's budget,
    // while still leaving headroom
    const upliftNumerator = 120n; // 20% increase
    const upliftDenominator = 100n;
    const increasedBptRaw =
        (bptAmount.rawAmount * upliftNumerator) / upliftDenominator;

    return {
        tokenAmounts,
        bptAmount: {
            ...bptAmount,
            rawAmount: increasedBptRaw,
        },
    };
}

export const getBptAmountFromReferenceAmountnbalancedViaSwapFromAdjustableAmount =
    async (
        input: AddLiquidityProportionalInput & {
            maxAdjustableAmountRaw: bigint;
        },
        poolState: PoolState,
    ): Promise<InputAmount> => {
        const poolStateWithBalances = await getPoolStateWithBalancesV3(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { bptAmount } =
            calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount(
                poolStateWithBalances,
                input.referenceAmount,
                input.maxAdjustableAmountRaw,
            );

        return bptAmount;
    };
