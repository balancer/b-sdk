import { Address, maxUint256, zeroAddress } from 'viem';
import { MathSol } from '@/utils';
import { doAddLiquidityUnbalancedViaSwapQuery } from '../addLiquidityUnbalancedViaSwap/doAddLiquidityUnbalancedViaSwapQuery';
import { AddLiquidityUnbalancedViaSwapInput } from '../addLiquidityUnbalancedViaSwap';

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
    input: AddLiquidityUnbalancedViaSwapInput,
    pool: Address,
    bptAmount: bigint,
    adjustableTokenIndex: number,
    block?: bigint,
): Promise<bigint> {
    const amountsIn = await doAddLiquidityUnbalancedViaSwapQuery(
        input.rpcUrl,
        input.chainId,
        pool,
        input.sender ?? zeroAddress,
        bptAmount,
        input.exactAmountIn.address,
        input.exactAmountIn.rawAmount,
        maxUint256,
        input.addLiquidityUserData ?? '0x',
        input.swapUserData ?? '0x',
        block,
    );

    const correctedBptAmount = calculateCorrectedBptAmount(
        bptAmount,
        amountsIn[adjustableTokenIndex],
        input.maxAdjustableAmountIn.rawAmount,
    );

    return correctedBptAmount;
}
