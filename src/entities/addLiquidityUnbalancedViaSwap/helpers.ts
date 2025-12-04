import { AddLiquidityUnbalancedViaSwapBuildCallInput } from './types';
import { TokenAmount } from '../tokenAmount';

export const getAmountsCallUnbalancedViaSwap = (
    input: AddLiquidityUnbalancedViaSwapBuildCallInput,
): {
    exactBptAmountOut: bigint;
    maxAdjustableAmount: bigint;
} => {
    // Apply slippage only to the adjustable amount (positive slippage for max)
    const adjustableAmount = input.amountsIn[input.adjustableTokenIndex];
    const maxAdjustableAmount = input.slippage.applyTo(adjustableAmount.amount);

    // Keep exact BPT amount unchanged (no slippage applied)
    const exactBptAmountOut = input.bptOut.amount;

    return {
        exactBptAmountOut,
        maxAdjustableAmount,
    };
};
