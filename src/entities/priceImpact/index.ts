import { formatUnits } from 'viem';
import { abs, max, min } from '../../utils';
import {
    AddLiquidity,
    AddLiquidityKind,
    AddLiquiditySingleTokenInput,
    AddLiquidityUnbalancedInput,
} from '../addLiquidity';
import { PriceImpactAmount } from '../priceImpactAmount';
import {
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquiditySingleTokenInput,
    RemoveLiquidityUnbalancedInput,
} from '../removeLiquidity';
import { TokenAmount } from '../tokenAmount';
import { PoolStateInput } from '../types';
import { getSortedTokens } from '../utils';
import { SwapKind } from '../../types';
import { SingleSwapInput, doQuerySwap } from '../utils/doQuerySwap';
import { Token } from '../token';

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
                diffBPTs.push(await queryBPTForDiffAtIndex(i));
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

                let kind: SwapKind;
                let givenIndex: number;
                let resultIndex: number;
                if (
                    diffBPTs[minPositiveDiffIndex] <
                    abs(diffBPTs[minNegativeDiffIndex])
                ) {
                    kind = SwapKind.GivenIn;
                    givenIndex = minPositiveDiffIndex;
                    resultIndex = minNegativeDiffIndex;
                } else {
                    kind = SwapKind.GivenOut;
                    givenIndex = minNegativeDiffIndex;
                    resultIndex = minPositiveDiffIndex;
                }

                const resultAmount = await doQuerySwap({
                    poolId: poolState.id,
                    kind,
                    tokenIn: poolTokens[minPositiveDiffIndex].toInputToken(),
                    tokenOut: poolTokens[minNegativeDiffIndex].toInputToken(),
                    givenAmount: abs(diffs[givenIndex]),
                    rpcUrl: input.rpcUrl,
                    chainId: input.chainId,
                });

                diffs[givenIndex] = 0n;
                diffBPTs[givenIndex] = 0n;
                diffs[resultIndex] = diffs[resultIndex] + resultAmount.amount;
                diffBPTs[resultIndex] = await queryBPTForDiffAtIndex(
                    resultIndex,
                );
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
            const signal = diffs[i] >= 0n ? 1n : -1n;
            return diffBPT.amount * signal;
        }
    };

    static singleSwap = async ({
        poolId,
        kind,
        tokenIn,
        tokenOut,
        givenAmount,
        rpcUrl,
        chainId,
    }: SingleSwapInput): Promise<PriceImpactAmount> => {
        const givenToken =
            kind === SwapKind.GivenIn
                ? new Token(chainId, tokenIn.address, tokenIn.decimals)
                : new Token(chainId, tokenOut.address, tokenOut.decimals);
        const amountInitial = TokenAmount.fromRawAmount(
            givenToken,
            givenAmount,
        );

        // simulate swap in original direction
        const resultAmount = await doQuerySwap({
            poolId,
            kind,
            tokenIn,
            tokenOut,
            givenAmount,
            rpcUrl,
            chainId,
        });

        // simulate swap in the reverse direction
        const amountFinal = await doQuerySwap({
            poolId: poolId,
            kind: kind,
            tokenIn: tokenOut,
            tokenOut: tokenIn,
            givenAmount: resultAmount.amount,
            rpcUrl,
            chainId,
        });

        // get relevant amounts for price impact calculation
        const amountInitialFloat = parseFloat(amountInitial.toSignificant());
        const amountFinalFloat = parseFloat(amountFinal.toSignificant());

        // calculate price impact using ABA method
        const priceImpact =
            Math.abs(amountInitialFloat - amountFinalFloat) /
            amountInitialFloat /
            2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
    };

    static removeLiquidity = async (
        input: RemoveLiquiditySingleTokenInput | RemoveLiquidityUnbalancedInput,
        poolState: PoolStateInput,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within RemoveLiquidity

        // simulate removing liquidity to get amounts out
        const removeLiquidity = new RemoveLiquidity();
        const { bptIn, amountsOut } = await removeLiquidity.query(
            input,
            poolState,
        );

        // simulate adding liquidity to get amounts in
        const addLiquidity = new AddLiquidity();
        const addLiquidityInput: AddLiquidityUnbalancedInput = {
            chainId: input.chainId,
            rpcUrl: input.rpcUrl,
            amountsIn: amountsOut.map((a) => a.toInputAmount()),
            kind: AddLiquidityKind.Unbalanced,
        };
        const { bptOut } = await addLiquidity.query(
            addLiquidityInput,
            poolState,
        );

        // get relevant amounts for price impact calculation
        const amountInitial = parseFloat(bptIn.toSignificant());
        const amountFinal = parseFloat(bptOut.toSignificant());

        // calculate price impact using ABA method
        const priceImpact = (amountInitial - amountFinal) / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
    };
}
