import { parseUnits, formatUnits, Address, Hex } from 'viem';
import { InputAmount } from '@/types';
import { HumanAmount } from '@/data';
import { inputValidationError, MathSol, SDKError, WAD } from '@/utils';
import { AddLiquidityProportionalInput } from '../addLiquidity/types';
import { ReClammPoolStateWithBalances } from '../types';
import { ChainId } from '@/utils/constants';
import { doAddLiquidityUnbalancedViaSwapQuery } from '../addLiquidityUnbalancedViaSwap/doAddLiquidityUnbalancedViaSwapQuery';

import { calculateProportionalAmounts } from './proportionalAmountsHelpers';

/**
 * Calculates a corrected BPT amount based on the ratio between the queried
 * maxAdjustableAmountIn and the user-provided one.
 *
 * This correction factor is used to iteratively approximate the desired
 * maxAdjustableAmountIn from below. Since the correction overcorrects,
 * it should be applied twice to get closer to the desired output.
 *
 * @param bptAmount - The current BPT amount to correct
 * @param queriedAdjustableAmount - The adjustable amount returned by the query
 * @param targetAdjustableAmount - The user-provided target adjustable amount
 * @returns The corrected BPT amount
 */
export function calculateCorrectedBptAmount(
    bptAmount: bigint,
    queriedAdjustableAmount: bigint,
    targetAdjustableAmount: bigint,
): bigint {
    const correctionFactor = MathSol.divDownFixed(
        queriedAdjustableAmount,
        targetAdjustableAmount,
    );
    return MathSol.divDownFixed(bptAmount, correctionFactor);
}

/**
 * Performs a query and applies BPT amount correction based on the ratio between
 * the queried maxAdjustableAmountIn and the user-provided target.
 *
 * @returns An object containing the corrected BPT amount and the amounts from the query
 */
export async function queryAndAdjustBptAmount(
    rpcUrl: string,
    chainId: ChainId,
    pool: Address,
    sender: Address,
    bptAmount: bigint,
    exactToken: Address,
    exactAmount: bigint,
    maxAdjustableAmount: bigint,
    addLiquidityUserData: Hex,
    swapUserData: Hex,
    adjustableTokenIndex: number,
    targetAdjustableAmount: bigint,
    block?: bigint,
): Promise<bigint> {
    const amountsIn = await doAddLiquidityUnbalancedViaSwapQuery(
        rpcUrl,
        chainId,
        pool,
        sender,
        bptAmount,
        exactToken,
        exactAmount,
        maxAdjustableAmount,
        addLiquidityUserData,
        swapUserData,
        block,
    );

    const correctedBptAmount = calculateCorrectedBptAmount(
        bptAmount,
        amountsIn[adjustableTokenIndex],
        targetAdjustableAmount,
    );

    return correctedBptAmount;
}

export function calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount(
    pool: ReClammPoolStateWithBalances,
    referenceAmount: InputAmount,
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
    // 1. Add virtual balances before calculation proportional BptAmount (to pool balances and the reference amount)
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

    const realVersusVirtualRatioOne = MathSol.divDownFixed(
        virtualBalanceOneScale18,
        parseUnits(pool.tokens[0].balance, 18),
    );
    const realVersusVirtualRatioTwo = MathSol.divDownFixed(
        virtualBalanceTwoScale18,
        parseUnits(pool.tokens[1].balance, 18),
    );

    const referenceAmountScale18 =
        referenceAmount.rawAmount *
        10n ** BigInt(18 - referenceAmount.decimals);
    const adjustedReferenceAmountScale18 = MathSol.mulDownFixed(
        referenceAmountScale18,
        WAD +
            (adjustableTokenIndex === 0
                ? realVersusVirtualRatioOne
                : realVersusVirtualRatioTwo),
    );
    // downscale reference amount to raw amount as the proportional calculation expects it
    const adjustedReferenceAmountRaw =
        adjustedReferenceAmountScale18 /
        10n ** BigInt(18 - referenceAmount.decimals);

    const PRECISION_FACTOR = 10n ** 18n;

    // TODO: refactor amounts into PoolTokenWithRate so it's easier to scale up/down

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
    const halfAdjustableRaw = adjustedReferenceAmountRaw / 2n;

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
        input: AddLiquidityProportionalInput,
        poolState: ReClammPoolStateWithBalances,
    ): Promise<{
        tokenAmounts: InputAmount[];
        bptAmount: InputAmount;
    }> => {
        // reclamms require token rates and virtual balances for the later part
        // of bpt estimation. They are part of the pool state

        const { tokenAmounts, bptAmount } =
            calculateBptAmountFromUnbalancedJoinTwoTokensFromAdjustableAmount(
                poolState,
                input.referenceAmount,
            );

        return { tokenAmounts, bptAmount };
    };
