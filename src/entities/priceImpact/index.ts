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

        // deltas between unbalanced and proportional amounts
        const deltas = amountsOut.map((a, i) => a.amount - amountsIn[i].amount);

        // get how much BPT each delta would mint
        const deltaBPTs: bigint[] = [];
        for (let i = 0; i < deltas.length; i++) {
            if (deltas[i] === 0n) {
                deltaBPTs.push(0n);
            } else {
                deltaBPTs.push(await queryBPTForDeltaAtIndex(i));
            }
        }

        // zero out deltas by swapping between tokens from proportionalAmounts
        // to exactAmountsIn, leaving the remaining delta within a single token
        const remainingDeltaIndex = await zeroOutDeltas(deltas, deltaBPTs);

        // get relevant amounts for price impact calculation
        const amountInitial = parseFloat(
            formatUnits(
                amountsIn[remainingDeltaIndex].amount,
                amountsIn[remainingDeltaIndex].token.decimals,
            ),
        );
        const amountDelta = parseFloat(
            formatUnits(
                abs(deltas[remainingDeltaIndex]),
                amountsIn[remainingDeltaIndex].token.decimals,
            ),
        );

        // calculate price impact using ABA method
        const priceImpact = amountDelta / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);

        // helper functions

        async function zeroOutDeltas(deltas: bigint[], deltaBPTs: bigint[]) {
            let minNegativeDeltaIndex = 0;
            const nonZeroDeltas = deltas.filter((d) => d !== 0n);
            for (let i = 0; i < nonZeroDeltas.length - 1; i++) {
                const minPositiveDeltaIndex = deltaBPTs.findIndex(
                    (deltaBPT) =>
                        deltaBPT === min(deltaBPTs.filter((a) => a > 0n)),
                );
                minNegativeDeltaIndex = deltaBPTs.findIndex(
                    (deltaBPT) =>
                        deltaBPT === max(deltaBPTs.filter((a) => a < 0n)),
                );

                let kind: SwapKind;
                let givenIndex: number;
                let resultIndex: number;
                if (
                    deltaBPTs[minPositiveDeltaIndex] <
                    abs(deltaBPTs[minNegativeDeltaIndex])
                ) {
                    kind = SwapKind.GivenIn;
                    givenIndex = minPositiveDeltaIndex;
                    resultIndex = minNegativeDeltaIndex;
                } else {
                    kind = SwapKind.GivenOut;
                    givenIndex = minNegativeDeltaIndex;
                    resultIndex = minPositiveDeltaIndex;
                }

                const resultAmount = await doQuerySwap({
                    poolId: poolState.id,
                    kind,
                    tokenIn: poolTokens[minPositiveDeltaIndex].toInputToken(),
                    tokenOut: poolTokens[minNegativeDeltaIndex].toInputToken(),
                    givenAmount: abs(deltas[givenIndex]),
                    rpcUrl: input.rpcUrl,
                    chainId: input.chainId,
                });

                deltas[givenIndex] = 0n;
                deltaBPTs[givenIndex] = 0n;
                deltas[resultIndex] = deltas[resultIndex] + resultAmount.amount;
                deltaBPTs[resultIndex] = await queryBPTForDeltaAtIndex(
                    resultIndex,
                );
            }
            return minNegativeDeltaIndex;
        }

        async function queryBPTForDeltaAtIndex(i: number): Promise<bigint> {
            const absDelta = TokenAmount.fromRawAmount(
                poolTokens[i],
                abs(deltas[i]),
            );
            const { bptOut: deltaBPT } = await addLiquidity.query(
                {
                    ...input,
                    amountsIn: [absDelta.toInputAmount()],
                },
                poolState,
            );
            const signal = deltas[i] >= 0n ? 1n : -1n;
            return deltaBPT.amount * signal;
        }
    };
}
