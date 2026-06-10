import { maxUint256, zeroAddress } from 'viem';
import { abs, SDKError } from '@/utils';
import { SwapKind } from '@/types';

import {
    AddLiquidityUnbalancedViaSwapV3,
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
} from '../addLiquidityUnbalancedViaSwap';
import { doAddLiquidityUnbalancedViaSwapQuery } from '../addLiquidityUnbalancedViaSwap/doAddLiquidityUnbalancedViaSwapQuery';
import { PriceImpactAmount } from '../priceImpactAmount';
import { RemoveLiquidity } from '../removeLiquidity';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../removeLiquidity/types';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { PoolState } from '../types';
import { getSortedTokens } from '../utils';
import { priceImpactABA } from './helper';
import { Swap, SwapInput } from '../swap';

/**
 * Calculate price impact on add liquidity unbalanced via swap operations.
 *
 * Adapted ABA for ReClamm: proportional remove + single GivenIn swap
 * reconciliation (no single-token or unbalanced remove).
 *
 * @param input same input used in the corresponding add liquidity operation
 * @param poolState same pool state used in the corresponding add liquidity operation
 * @returns price impact amount
 */
export const addLiquidityUnbalancedViaSwap = async (
    input: AddLiquidityUnbalancedViaSwapInput,
    poolState: PoolState,
): Promise<PriceImpactAmount> => {
    const addLiquidityUnbalancedViaSwapV3 =
        new AddLiquidityUnbalancedViaSwapV3();

    let queryOutput: AddLiquidityUnbalancedViaSwapQueryOutput;
    try {
        queryOutput = await addLiquidityUnbalancedViaSwapV3.query(
            input,
            poolState,
        );
    } catch (err) {
        throw new SDKError(
            'Price Impact',
            'Add Liquidity Unbalanced Via Swap',
            `addLiquidityUnbalancedViaSwap operation will fail at SC level with user defined input.\n${err}`,
        );
    }

    const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
    const exactZeroIndex = sortedTokens.findIndex((t) =>
        t.isSameAddress(queryOutput.exactAmountIn.token.address),
    );
    const adjustableIndex = exactZeroIndex === 0 ? 1 : 0;

    let amountsInRaw: bigint[];
    try {
        amountsInRaw = await doAddLiquidityUnbalancedViaSwapQuery(
            input.rpcUrl,
            input.chainId,
            poolState.address,
            input.sender ?? zeroAddress,
            queryOutput.bptOut.amount,
            queryOutput.exactAmountIn.token.address,
            0n,
            maxUint256,
            queryOutput.addLiquidityUserData,
            queryOutput.swapUserData,
        );
    } catch (err) {
        throw new SDKError(
            'Price Impact',
            'Add Liquidity Unbalanced Via Swap',
            `addLiquidityUnbalancedViaSwap operation will fail at SC level with user defined input.\n${err}`,
        );
    }

    const amountsIn = amountsInRaw.map((amount, i) =>
        TokenAmount.fromRawAmount(sortedTokens[i], amount),
    );

    const remainingDelta = await reconcileViaSwapReverse(
        input,
        poolState,
        queryOutput.bptOut,
        amountsIn,
        adjustableIndex,
        exactZeroIndex,
        sortedTokens,
    );

    if (remainingDelta === null) {
        return PriceImpactAmount.fromRawAmount(0n);
    }

    const deltaAmount = TokenAmount.fromRawAmount(
        amountsIn[adjustableIndex].token,
        abs(remainingDelta),
    );

    return priceImpactABA(
        amountsIn[adjustableIndex],
        amountsIn[adjustableIndex].sub(deltaAmount),
    );
};

async function reconcileViaSwapReverse(
    input: AddLiquidityUnbalancedViaSwapInput,
    poolState: PoolState,
    bptOut: TokenAmount,
    amountsIn: TokenAmount[],
    adjustableIndex: number,
    exactZeroIndex: number,
    poolTokens: Token[],
): Promise<bigint | null> {
    const removeLiquidity = new RemoveLiquidity();
    const removeLiquidityInput: RemoveLiquidityInput = {
        chainId: input.chainId,
        rpcUrl: input.rpcUrl,
        bptIn: bptOut.toInputAmount(),
        kind: RemoveLiquidityKind.Proportional,
    };

    let amountsOut: TokenAmount[];
    try {
        const queryResult = await removeLiquidity.query(
            removeLiquidityInput,
            poolState,
        );
        amountsOut = queryResult.amountsOut;
    } catch (err) {
        throw new SDKError(
            'Price Impact',
            'Add Liquidity Unbalanced Via Swap',
            `Unexpected error while calculating addLiquidityUnbalancedViaSwap PI at Remove step.\n${err}`,
        );
    }

    const deltas = amountsOut.map((a, i) => a.amount - amountsIn[i].amount);

    if (deltas.every((d) => d === 0n)) {
        return null;
    }

    if (deltas[adjustableIndex] >= 0n || deltas[exactZeroIndex] <= 0n) {
        throw new SDKError(
            'Price Impact',
            'Add Liquidity Unbalanced Via Swap',
            'Unexpected delta signs after proportional remove',
        );
    }

    try {
        const swapInput: SwapInput = {
            chainId: input.chainId,
            paths: [
                {
                    tokens: [
                        poolTokens[exactZeroIndex].toInputToken(),
                        poolTokens[adjustableIndex].toInputToken(),
                    ],
                    pools: [poolState.id],
                    inputAmountRaw: abs(deltas[exactZeroIndex]),
                    outputAmountRaw: 0n,
                    protocolVersion: poolState.protocolVersion,
                },
            ],
            swapKind: SwapKind.GivenIn,
        };
        const swap = new Swap(swapInput);
        const result = await swap.query(input.rpcUrl);
        const swapOut =
            result.swapKind === SwapKind.GivenIn
                ? result.expectedAmountOut.amount
                : result.expectedAmountIn.amount;

        deltas[exactZeroIndex] = 0n;
        deltas[adjustableIndex] += swapOut;
    } catch (err) {
        throw new SDKError(
            'Price Impact',
            'Add Liquidity Unbalanced Via Swap',
            `Unexpected error while calculating addLiquidityUnbalancedViaSwap PI at Swap step.\n${err}`,
        );
    }

    const remainingDelta = deltas[adjustableIndex];
    if (remainingDelta > 0n) {
        throw new SDKError(
            'Price Impact',
            'Add Liquidity Unbalanced Via Swap',
            'Unexpected positive remaining delta after swap reconciliation',
        );
    }

    return remainingDelta;
}
