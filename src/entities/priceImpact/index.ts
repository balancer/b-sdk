import { formatUnits } from 'viem';
import { MathSol, abs, max, min } from '../../utils';
import { AddLiquidity } from '../addLiquidity';
import {
    AddLiquidityKind,
    AddLiquiditySingleTokenInput,
    AddLiquidityUnbalancedInput,
} from '../addLiquidity/types';
import { PriceImpactAmount } from '../priceImpactAmount';
import { RemoveLiquidity } from '../removeLiquidity';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityUnbalancedInput,
} from '../removeLiquidity/types';
import { TokenAmount } from '../tokenAmount';
import { PoolState } from '../types';
import { getSortedTokens } from '../utils';
import { SingleSwap, SwapKind } from '../../types';
import { doSingleSwapQuery } from '../utils/doSingleSwapQuery';
import { Swap, SwapInput } from '../swap';
import { Token } from '../token';

export class PriceImpact {
    static addLiquiditySingleToken = async (
        input: AddLiquiditySingleTokenInput,
        poolState: PoolState,
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
            kind: RemoveLiquidityKind.SingleTokenExactIn,
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
        poolState: PoolState,
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
                deltaBPTs.push(await queryAddLiquidityForTokenDelta(i));
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
                let givenTokenIndex: number;
                let resultTokenIndex: number;
                if (
                    deltaBPTs[minPositiveDeltaIndex] <
                    abs(deltaBPTs[minNegativeDeltaIndex])
                ) {
                    kind = SwapKind.GivenIn;
                    givenTokenIndex = minPositiveDeltaIndex;
                    resultTokenIndex = minNegativeDeltaIndex;
                } else {
                    kind = SwapKind.GivenOut;
                    givenTokenIndex = minNegativeDeltaIndex;
                    resultTokenIndex = minPositiveDeltaIndex;
                }

                const singleSwap: SingleSwap = {
                    poolId: poolState.id,
                    kind,
                    assetIn: poolTokens[minPositiveDeltaIndex].address,
                    assetOut: poolTokens[minNegativeDeltaIndex].address,
                    amount: abs(deltas[givenTokenIndex]),
                    userData: '0x',
                };

                /**
                 * TODO V3: right now swap exists only as part of the SOR.
                 * We could make it a proper entity with v2/v3 variations and
                 * consume it here as a higher level abstraction.
                 */
                const resultAmount = await doSingleSwapQuery({
                    ...singleSwap,
                    rpcUrl: input.rpcUrl,
                    chainId: input.chainId,
                });

                deltas[givenTokenIndex] = 0n;
                deltaBPTs[givenTokenIndex] = 0n;
                deltas[resultTokenIndex] =
                    deltas[resultTokenIndex] + resultAmount;
                deltaBPTs[resultTokenIndex] =
                    await queryAddLiquidityForTokenDelta(resultTokenIndex);
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
            const { bptOut: deltaBPT } = await addLiquidity.query(
                {
                    ...input,
                    amountsIn: [absDelta.toInputAmount()],
                },
                poolState,
            );
            const signal = deltas[tokenIndex] >= 0n ? 1n : -1n;
            return deltaBPT.amount * signal;
        }
    };

    static removeLiquidity = async (
        input:
            | RemoveLiquiditySingleTokenExactInInput
            | RemoveLiquidityUnbalancedInput,
        poolState: PoolState,
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

    static swap = async (
        swapInput: SwapInput,
        rpcUrl?: string,
        block?: bigint,
    ): Promise<PriceImpactAmount> => {
        // simulate swapping to get amount out
        const swap = new Swap(swapInput);
        const swapQueryOutput = await swap.query(rpcUrl, block);

        // build reverse swap with expected amount as given amount
        let expectedAmountsOut: bigint[];
        let expectedAmountsIn: bigint[];
        if (swapQueryOutput.swapKind === SwapKind.GivenIn) {
            expectedAmountsOut = swapQueryOutput.pathAmounts ?? [
                swapQueryOutput.expectedAmountOut.amount,
            ];
            expectedAmountsIn = swapInput.paths.map((p) => p.inputAmountRaw);
        } else {
            expectedAmountsIn = swapQueryOutput.pathAmounts ?? [
                swapQueryOutput.expectedAmountIn.amount,
            ];
            expectedAmountsOut = swapInput.paths.map((p) => p.outputAmountRaw);
        }
        const reverseSwapInput: SwapInput = {
            ...swapInput,
            paths: swapInput.paths.map((p, i) => ({
                ...p,
                tokens: [...p.tokens].reverse(),
                pools: [...p.pools].reverse(),
                outputAmountRaw: expectedAmountsIn[i],
                inputAmountRaw: expectedAmountsOut[i],
            })),
        };

        // simulate reverse swapping to get amount in
        const reverseSwap = new Swap(reverseSwapInput);
        const reverseSwapQueryOutput = await reverseSwap.query(rpcUrl, block);

        // get relevant amounts for price impact calculation
        const tokenAIndex =
            swapInput.swapKind === SwapKind.GivenIn
                ? 0 // first token of the path
                : swapInput.paths[0].tokens.length - 1; // last token of the path
        const tokenA = new Token(
            swapInput.chainId,
            swapInput.paths[0].tokens[tokenAIndex].address,
            swapInput.paths[0].tokens[tokenAIndex].decimals,
        );
        let initialA: TokenAmount;
        let finalA: TokenAmount;
        if ('expectedAmountOut' in reverseSwapQueryOutput) {
            // givenIn case
            initialA = TokenAmount.fromRawAmount(
                tokenA,
                swapInput.paths
                    .map((p) => p.inputAmountRaw)
                    .reduce((a, b) => a + b),
            );
            finalA = TokenAmount.fromRawAmount(
                tokenA,
                reverseSwapQueryOutput.expectedAmountOut.amount,
            );
        } else {
            // givenOut case
            // Note: in the given out case, query output is greater than input, so we
            // reverse the order of initialA and finalA for ABA to work as expected
            initialA = TokenAmount.fromRawAmount(
                tokenA,
                reverseSwapQueryOutput.expectedAmountIn.amount,
            );
            finalA = TokenAmount.fromRawAmount(
                tokenA,
                swapInput.paths
                    .map((p) => p.outputAmountRaw)
                    .reduce((a, b) => a + b),
            );
        }

        return priceImpactABA(initialA, finalA);
    };
}

/**
 * Applies the ABA method to calculate the price impact of an operation.
 * @param initialA amount of token A at the begginig of the ABA process, i.e. A -> B amountIn
 * @param finalA amount of token A at the end of the ABA process, i.e. B -> A amountOut
 * @returns
 */
export const priceImpactABA = (initialA: TokenAmount, finalA: TokenAmount) => {
    const priceImpact = MathSol.divDownFixed(
        initialA.scale18 - finalA.scale18,
        initialA.scale18 * 2n,
    );
    return PriceImpactAmount.fromRawAmount(priceImpact);
};
