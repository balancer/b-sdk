import { AddLiquidityUnbalancedViaSwapBuildCallInput } from './types';
import { TokenAmount } from '../tokenAmount';

export const getAmountsCallUnbalancedViaSwap = (
    input: AddLiquidityUnbalancedViaSwapBuildCallInput,
): {
    exactBptAmountOut: bigint;
    maxAdjustableAmount: bigint;
} => {
    // Apply slippage to decrease exactBptAmountOut (negative direction)
    const exactBptAmountOut = input.slippage.applyTo(input.bptOut.amount, -1);

    // Keep adjustable amount unchanged (no slippage applied)
    const adjustableAmount = input.amountsIn[input.adjustableTokenIndex];
    const maxAdjustableAmount = adjustableAmount.amount;

    return {
        exactBptAmountOut,
        maxAdjustableAmount,
    };
};
