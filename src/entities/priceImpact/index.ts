import { formatUnits } from 'viem';
import { abs, max, min } from '../../utils';
import {
    AddLiquidity,
    AddLiquiditySingleTokenInput,
    AddLiquidityUnbalancedInput,
} from '../addLiquidity';
import { PriceImpactAmount } from '../priceImpactAmount';
import {
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../removeLiquidity';
import { TokenAmount } from '../tokenAmount';
import { PoolStateInput } from '../types';
import { getSortedTokens } from '../utils';
import { SwapKind } from '../../types';
import { doQuerySwap } from '../utils/doQuerySwap';

export class PriceImpact {
    static addLiquiditySingleToken = async (
        input: AddLiquiditySingleTokenInput,
        poolState: PoolStateInput,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within AddLiquidity

        // simulate adding liquidity to get amounts in
        const addLiquidity = new AddLiquidity();
        const { amountsIn } = await addLiquidity.query(input, poolState);

        // simulate removing liquidity to get amounts out
        const removeLiquidity = new RemoveLiquidity();
        const removeLiquidityInput: RemoveLiquidityInput = {
            chainId: input.chainId,
            rpcUrl: input.rpcUrl,
            bptIn: input.bptOut,
            tokenOut: input.tokenIn,
            kind: RemoveLiquidityKind.SingleToken,
        };
        const { amountsOut } = await removeLiquidity.query(
            removeLiquidityInput,
            poolState,
        );

        // get relevant amounts for price impact calculation
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const tokenIndex = sortedTokens.findIndex((t) =>
            t.isSameAddress(input.tokenIn),
        );
        const amountInitial = parseFloat(amountsIn[tokenIndex].toSignificant());
        const amountFinal = parseFloat(amountsOut[tokenIndex].toSignificant());

        // calculate price impact using ABA method
        const priceImpact = (amountInitial - amountFinal) / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
    };

    static addLiquidityUnbalanced = async (
        input: AddLiquidityUnbalancedInput,
        poolState: PoolStateInput,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within AddLiquidity

        // simulate adding liquidity to get amounts in
        const addLiquidity = new AddLiquidity();
        const { amountsIn, bptOut } = await addLiquidity.query(
            input,
            poolState,
        );
        const poolTokens = amountsIn.map((a) => a.token);

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

        // diffs between unbalanced and proportional amounts
        const diffs = amountsOut.map((a, i) => a.amount - amountsIn[i].amount);

        // get how much BPT each diff would mint
        const diffBPTs: bigint[] = [];
        for (let i = 0; i < diffs.length; i++) {
            if (diffs[i] === 0n) {
                diffBPTs.push(0n);
            } else {
                const diffBPT = await queryBPTForDiffAtIndex(i);
                diffBPTs.push(diffs[i] > 0n ? diffBPT : diffBPT * -1n);
            }
        }

        // zero out diffs by swapping between tokens from proportionalAmounts
        // to exactAmountsIn, leaving the remaining diff within a single token
        const remainingDiffIndex = await zeroOutDiffs(diffs, diffBPTs);

        // get relevant amounts for price impact calculation
        const amountInitial = parseFloat(
            formatUnits(
                amountsIn[remainingDiffIndex].amount,
                amountsIn[remainingDiffIndex].token.decimals,
            ),
        );
        const amountDiff = parseFloat(
            formatUnits(
                abs(diffs[remainingDiffIndex]),
                amountsIn[remainingDiffIndex].token.decimals,
            ),
        );

        // calculate price impact using ABA method
        const priceImpact = amountDiff / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);

        // helper functions

        async function zeroOutDiffs(diffs: bigint[], diffBPTs: bigint[]) {
            let minNegativeDiffIndex = 0;
            const nonZeroDiffs = diffs.filter((d) => d !== 0n);
            for (let i = 0; i < nonZeroDiffs.length - 1; i++) {
                const minPositiveDiffIndex = diffBPTs.findIndex(
                    (diffBPT) =>
                        diffBPT === min(diffBPTs.filter((a) => a > 0n)),
                );
                minNegativeDiffIndex = diffBPTs.findIndex(
                    (diffBPT) =>
                        diffBPT === max(diffBPTs.filter((a) => a < 0n)),
                );

                if (
                    diffBPTs[minPositiveDiffIndex] <
                    abs(diffBPTs[minNegativeDiffIndex])
                ) {
                    // zero out min positive diff
                    const returnAmount = await doQuerySwap(
                        poolState.id,
                        SwapKind.GivenIn,
                        TokenAmount.fromRawAmount(
                            poolTokens[minPositiveDiffIndex],
                            diffs[minPositiveDiffIndex],
                        ),
                        poolTokens[minNegativeDiffIndex],
                        input.rpcUrl,
                        input.chainId,
                    );
                    diffs[minPositiveDiffIndex] = 0n;
                    diffBPTs[minPositiveDiffIndex] = 0n;
                    diffs[minNegativeDiffIndex] =
                        diffs[minNegativeDiffIndex] + returnAmount.amount;

                    const diffBPT = await queryBPTForDiffAtIndex(
                        minNegativeDiffIndex,
                    );
                    diffBPTs[minNegativeDiffIndex] = diffBPT * -1n;
                } else {
                    // zero out min negative diff
                    const returnAmount = await doQuerySwap(
                        poolState.id,
                        SwapKind.GivenOut,
                        TokenAmount.fromRawAmount(
                            poolTokens[minPositiveDiffIndex],
                            abs(diffs[minNegativeDiffIndex]),
                        ),
                        poolTokens[minNegativeDiffIndex],
                        input.rpcUrl,
                        input.chainId,
                    );
                    diffs[minNegativeDiffIndex] = 0n;
                    diffBPTs[minNegativeDiffIndex] = 0n;
                    diffs[minPositiveDiffIndex] =
                        diffs[minPositiveDiffIndex] + returnAmount.amount;
                    const diffBPT = await queryBPTForDiffAtIndex(
                        minPositiveDiffIndex,
                    );
                    diffBPTs[minPositiveDiffIndex] = diffBPT;
                }
            }
            return minNegativeDiffIndex;
        }

        async function queryBPTForDiffAtIndex(i: number): Promise<bigint> {
            const absDiff = TokenAmount.fromRawAmount(
                poolTokens[i],
                abs(diffs[i]),
            );
            const { bptOut: diffBPT } = await addLiquidity.query(
                {
                    ...input,
                    amountsIn: [absDiff.toInputAmount()],
                },
                poolState,
            );
            return diffBPT.amount;
        }
    };
}
