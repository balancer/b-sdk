import { Address, parseUnits, formatUnits } from 'viem';
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
    ReClammPoolStateWithBalances,
} from '../types';
import { getPoolStateWithBalancesV2 } from './getPoolStateWithBalancesV2';
import {
    getBoostedPoolStateWithBalancesV3,
    getPoolStateWithBalancesV3,
} from './getPoolStateWithBalancesV3';
import { AddLiquidityBoostedProportionalInput } from '../addLiquidityBoosted/types';

import { calculateProportionalAmounts } from './proportionalAmountsHelpers';
import { TokenAmount } from '../tokenAmount';

export function calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount(
    pool: ReClammPoolStateWithBalances,
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

    // token rates and virtal balances are shared in human amounts
    // and possibly need to be upscaled.
    // 1. Add virtual balances before calculation proportional BptAmount
    // 2. handle raw vs live amounts
    //     2.1 amountsIn - raw amount
    //     2.2 real tokenBalance - raw amount
    //     2.3 virtual tokenBalance - live amount (i.e. scaled to 18 and with rates applied)
    //     Best to downscale virtual balances to Human amounts first to make the calculations
    //     Take virtual balances[0] / 1e(18 - decimals[0]) / tokenRates[0]

    // The pool balances are shared in HumanAmount. Before the calculation
    // the pool balances are upscaled to raw amounts in the calculateProportionalAmounts
    // referenceAmount is shared in raw Amount
    // for this function rates and virtual balances are shared in HumanAmounts
    // What is left is to downscale the virtualBalances from the token rate

    const virtualBalanceOneScale18 = parseUnits(pool.virtualBalances[0], 18);
    const virtualBalanceTwoScale18 = parseUnits(pool.virtualBalances[1], 18);
    const tokenRateOneScale18 = parseUnits(pool.tokenRates[0], 18);
    const tokenRateTwoScale18 = parseUnits(pool.tokenRates[1], 18);

    const PRECISION_FACTOR = 10n ** 18n;

    const effectiveBalanceOneScale18 =
        (virtualBalanceOneScale18 * PRECISION_FACTOR) / tokenRateOneScale18;
    const effectiveBalanceTwoScale18 =
        (virtualBalanceTwoScale18 * PRECISION_FACTOR) / tokenRateTwoScale18;

    // add virtual balances to the pool balances and then forward the pool
    // to the proportional calculation
    const poolWithAddedBalancesHumanAmount = {
        ...pool,
        tokens: pool.tokens.map((token, i) => ({
            ...token,
            balance:
                i === 0
                    ? (formatUnits(
                          parseUnits(token.balance, 18) +
                              effectiveBalanceOneScale18,
                          18,
                      ) as HumanAmount)
                    : (formatUnits(
                          parseUnits(token.balance, 18) +
                              effectiveBalanceTwoScale18,
                          18,
                      ) as HumanAmount),
        })),
    };

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
        poolWithAddedBalancesHumanAmount,
        halfReferenceAmount,
    );

    return {
        tokenAmounts,
        bptAmount,
    };
}

export const getBptAmountFromReferenceAmountnbalancedViaSwapFromAdjustableAmount =
    async (
        input: AddLiquidityProportionalInput & {
            maxAdjustableAmountRaw: bigint;
        },
        poolState: ReClammPoolStateWithBalances,
    ): Promise<InputAmount> => {
        // reclamms require token rates and virtual balances for the later part
        // of bpt estimation. They are part of the pool state

        const { bptAmount } =
            calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount(
                poolState,
                input.referenceAmount,
                input.maxAdjustableAmountRaw,
            );

        return bptAmount;
    };
