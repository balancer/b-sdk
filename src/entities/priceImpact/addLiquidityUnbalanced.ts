import { abs, max, min, SDKError } from '@/utils';
import { SwapKind } from '@/types';

import { AddLiquidity } from '../addLiquidity';
import { AddLiquidityUnbalancedInput } from '../addLiquidity/types';
import { PriceImpactAmount } from '../priceImpactAmount';
import { RemoveLiquidity } from '../removeLiquidity';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../removeLiquidity/types';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { PoolState } from '../types';
import { priceImpactABA } from './helper';
import { Swap, SwapInput } from '../swap';
import { BaseToken } from '@/entities/baseToken';

export const addLiquidityUnbalanced = async (
    input: AddLiquidityUnbalancedInput,
    poolState: PoolState,
): Promise<PriceImpactAmount> => {
    // inputs are being validated within AddLiquidity

    // simulate adding liquidity to get amounts in
    const addLiquidity = new AddLiquidity();
    let amountsIn: TokenAmount[];
    let bptOut: TokenAmount;
    let poolTokens: BaseToken[];
    try {
        const queryResult = await addLiquidity.query(input, poolState);
        amountsIn = queryResult.amountsIn;
        bptOut = queryResult.bptOut;
        poolTokens = amountsIn.map((a) => a.token);
    } catch (err) {
        throw new SDKError(
            'Price Impact',
            'Add Liquidity Unbalanced',
            `addLiquidityUnbalanced operation will fail at SC level with user defined input.\n${err}`,
        );
    }

    // simulate removing liquidity to get amounts out
    const removeLiquidity = new RemoveLiquidity();
    const removeLiquidityInput: RemoveLiquidityInput = {
        chainId: input.chainId,
        rpcUrl: input.rpcUrl,
        bptIn: bptOut.toInputAmount(),
        kind: RemoveLiquidityKind.Proportional,
    };
    const { amountsOut } = await removeLiquidity.query(
        removeLiquidityInput,
        poolState,
    );

    // deltas between unbalanced and proportional amounts
    const deltas = amountsOut.map((a, i) => a.amount - amountsIn[i].amount);

    // get how much BPT each delta would mint
    const deltaBPTs: bigint[] = [];
    for (let i = 0; i < deltas.length; i++) {
        if (deltas[i] === 0n) {
            deltaBPTs.push(0n);
        } else {
            deltaBPTs.push(await queryAddLiquidityForTokenDelta(i));
        }
    }

    // zero out deltas by swapping between tokens from proportionalAmounts
    // to exactAmountsIn, leaving the remaining delta within a single token
    let remainingDeltaIndex = 0;
    if (deltaBPTs.some((deltaBPT) => deltaBPT !== 0n)) {
        remainingDeltaIndex = await zeroOutDeltas(deltas, deltaBPTs);
    }

    // get relevant amount for price impact calculation
    const deltaAmount = TokenAmount.fromRawAmount(
        amountsIn[remainingDeltaIndex].token,
        abs(deltas[remainingDeltaIndex]),
    );

    // calculate price impact using ABA method
    return priceImpactABA(
        amountsIn[remainingDeltaIndex],
        amountsIn[remainingDeltaIndex].sub(deltaAmount),
    );

    // helper functions

    async function zeroOutDeltas(deltas: bigint[], deltaBPTs: bigint[]) {
        let minNegativeDeltaIndex = deltaBPTs.findIndex(
            (deltaBPT) => deltaBPT === max(deltaBPTs.filter((a) => a < 0n)),
        );
        const nonZeroDeltasBPTs = deltaBPTs.filter((d) => d !== 0n);
        for (let i = 0; i < nonZeroDeltasBPTs.length - 1; i++) {
            const minPositiveDeltaIndex = deltaBPTs.findIndex(
                (deltaBPT) => deltaBPT === min(deltaBPTs.filter((a) => a > 0n)),
            );
            minNegativeDeltaIndex = deltaBPTs.findIndex(
                (deltaBPT) => deltaBPT === max(deltaBPTs.filter((a) => a < 0n)),
            );

            let swapKind: SwapKind;
            let givenTokenIndex: number;
            let resultTokenIndex: number;
            let inputAmountRaw = 0n;
            let outputAmountRaw = 0n;
            if (
                deltaBPTs[minPositiveDeltaIndex] <
                abs(deltaBPTs[minNegativeDeltaIndex])
            ) {
                swapKind = SwapKind.GivenIn;
                givenTokenIndex = minPositiveDeltaIndex;
                resultTokenIndex = minNegativeDeltaIndex;
                inputAmountRaw = abs(deltas[givenTokenIndex]);
            } else {
                swapKind = SwapKind.GivenOut;
                givenTokenIndex = minNegativeDeltaIndex;
                resultTokenIndex = minPositiveDeltaIndex;
                outputAmountRaw = abs(deltas[givenTokenIndex]);
            }
            try {
                const swapInput: SwapInput = {
                    chainId: input.chainId,
                    paths: [
                        {
                            tokens: [
                                poolTokens[
                                    minPositiveDeltaIndex
                                ].toInputToken(),
                                poolTokens[
                                    minNegativeDeltaIndex
                                ].toInputToken(),
                            ],
                            pools: [poolState.id],
                            inputAmountRaw,
                            outputAmountRaw,
                            protocolVersion: poolState.protocolVersion,
                        },
                    ],
                    swapKind,
                };
                const swap = new Swap(swapInput);
                const result = await swap.query(input.rpcUrl);
                const resultAmount =
                    result.swapKind === SwapKind.GivenIn
                        ? result.expectedAmountOut
                        : result.expectedAmountIn;

                deltas[givenTokenIndex] = 0n;
                deltaBPTs[givenTokenIndex] = 0n;
                deltas[resultTokenIndex] =
                    deltas[resultTokenIndex] + resultAmount.amount;
                deltaBPTs[resultTokenIndex] =
                    await queryAddLiquidityForTokenDelta(resultTokenIndex);
            } catch {
                throw new SDKError(
                    'Price Impact',
                    'Add Liquidity Unbalanced',
                    'Unexpected error while calculating addLiquidityUnbalanced PI at Swap step',
                );
            }
        }
        return minNegativeDeltaIndex;
    }

    async function queryAddLiquidityForTokenDelta(
        tokenIndex: number,
    ): Promise<bigint> {
        const absDelta = TokenAmount.fromRawAmount(
            poolTokens[tokenIndex],
            abs(deltas[tokenIndex]),
        );
        try {
            const { bptOut: deltaBPT } = await addLiquidity.query(
                {
                    ...input,
                    amountsIn: [absDelta.toInputAmount()],
                },
                poolState,
            );
            const signal = deltas[tokenIndex] >= 0n ? 1n : -1n;
            return deltaBPT.amount * signal;
        } catch {
            throw new SDKError(
                'Price Impact',
                'Add Liquidity Unbalanced',
                'Unexpected error while calculating addLiquidityUnbalanced PI at Delta add step',
            );
        }
    }
};
