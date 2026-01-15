import { Address, Hex } from 'viem';
import { MathSol } from '@/utils';
import { ChainId } from '@/utils/constants';
import { doAddLiquidityUnbalancedViaSwapQuery } from '../addLiquidityUnbalancedViaSwap/doAddLiquidityUnbalancedViaSwapQuery';

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
