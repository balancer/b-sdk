import { MathSol, abs, max, min } from '../../utils';
import { InputAmount, SingleSwap, SwapKind } from '../../types';

import { AddLiquidity } from '../addLiquidity';
import {
    AddLiquidityKind,
    AddLiquiditySingleTokenInput,
    AddLiquidityUnbalancedInput,
} from '../addLiquidity/types';
import { AddLiquidityNested } from '../addLiquidityNested';
import { AddLiquidityNestedInput } from '../addLiquidityNested/types';
import { PriceImpactAmount } from '../priceImpactAmount';
import { RemoveLiquidity } from '../removeLiquidity';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityUnbalancedInput,
} from '../removeLiquidity/types';
import { RemoveLiquidityNested } from '../removeLiquidityNested';
import { RemoveLiquidityNestedSingleTokenInput } from '../removeLiquidityNested/types';
import { TokenAmount } from '../tokenAmount';
import { NestedPoolState, PoolState } from '../types';
import { getSortedTokens, SingleSwapInput, doSingleSwapQuery } from '../utils';

export class PriceImpact {
    /**
     * Calculate price impact on add liquidity single token operations
     * @param input same input used in the corresponding add liquidity operation
     * @param poolState same pool state used in the corresponding add liquidity operation
     * @returns price impact amount
     */
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

        return priceImpactABA(amountsIn[tokenIndex], amountsOut[tokenIndex]);
    };

    /**
     * Calculate price impact on add liquidity unbalanced operations
     *
     * This is the only price impact calculation that adapts the ABA method instead
     * of applying it directly. This happens because tha ABA method requires a
     * corresponding reverse operation to be applied, so we "get back" to the original
     * state for comparison, hence A -> B -> A.
     * This is not possible for AddLiquidityUnbalanced on v3 because there is no
     * RemoveLiquidityUnbalanced.
     * The alternative found was to simulate the RemoveLiquidityUnbalanced by applying
     * RemoveLiquidityProportional and then swapping between tokens.
     *
     * Here are the steps to calculate the price impact for add liquidity unbalanced:
     * 1. query add liquidity unbalanced with `exactAmountsIn` to get `bptOut`
     * 2. query remove liquidity proportional with `bptOut` as `bptIn` to get `proportionalAmountsOut`
     * 3. get `diffs` =  `proportionalAmountsOut` - `exactAmountsIn`
     * 4. swap between tokens zeroing out the `diffs` between `proportionalAmountsOut`
     *    and `exactAmountsIn`, leaving the remaining diff within a single
     *    token → `diffFinal` (see code below for detailed steps)
     * 5. `amountInitial` will be the the `exactAmountsIn` respective to `diffFinal` token
     * 6. price impact ABA = `diffFinal` / `amountInitial` / 2
     *
     * @param input same input used in the corresponding add liquidity operation
     * @param poolState same pool state used in the corresponding add liquidity operation
     * @returns price impact amount
     */
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

    /**
     * Calculate price impact on adding liquidity for nested pools.
     *
     * Note: is based on the premise that the price impact on adding liquidity
     * for nested pools is the sum of the price impacts of each add liquidity
     * operation in the nested pools.
     * @param input same input used in the corresponding add liquidity nested operation
     * @param nestedPoolState same nested pool state used in the corresponding add liquidity nested operation
     * @returns price impact amount
     */
    static addLiquidityNested = async (
        input: AddLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within AddLiquidityNested

        let amountsIn: InputAmount[] = [];
        const addLiquidity = new AddLiquidity();
        const sortedPools = nestedPoolState.pools.sort(
            (a, b) => a.level - b.level,
        );
        const priceImpactAmounts: PriceImpactAmount[] = [];
        const bptOuts: InputAmount[] = [];
        for (const pool of sortedPools) {
            if (pool.level === 0) {
                amountsIn = input.amountsIn.filter((a) =>
                    pool.tokens.some(
                        (t) =>
                            t.address.toLowerCase() === a.address.toLowerCase(),
                    ),
                );
                // skip pool if no relevant amountsIn
                if (amountsIn.length === 0) {
                    continue;
                }
            } else {
                amountsIn = [...bptOuts, ...input.amountsIn].filter((a) =>
                    pool.tokens.some(
                        (t) =>
                            t.address.toLowerCase() === a.address.toLowerCase(),
                    ),
                );
            }

            // build addLiquidityInput
            const addLiquidityInput: AddLiquidityUnbalancedInput = {
                chainId: input.chainId,
                rpcUrl: input.rpcUrl,
                amountsIn,
                kind: AddLiquidityKind.Unbalanced,
            };
            const poolState: PoolState = {
                ...pool,
                balancerVersion: 2, // TODO: refactor to allow v3 on a separate PR
            };

            // calculate individual price impact
            const poolPriceImpact = await PriceImpact.addLiquidityUnbalanced(
                addLiquidityInput,
                poolState,
            );
            priceImpactAmounts.push(poolPriceImpact);

            // get bptOut so it can be used as amountsIn for the next pool
            const { bptOut } = await addLiquidity.query(
                addLiquidityInput,
                poolState,
            );
            bptOuts.push(bptOut.toInputAmount());
        }

        const priceImpactSum = priceImpactAmounts.reduce(
            (acc, cur) => acc + cur.amount,
            0n,
        );

        return PriceImpactAmount.fromRawAmount(priceImpactSum);
    };

    /**
     * Calculate price impact on remove liquidity operations
     * @param input same input used in the corresponding remove liquidity operation
     * @param poolState same pool state used in the corresponding remove liquidity operation
     * @returns price impact amount
     */
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

        // calculate price impact using ABA method
        return priceImpactABA(bptIn, bptOut);
    };

    /**
     * Calculate price impact on removing liquidity for nested pools.
     *
     * Note: is based on the premise that the price impact on removing liquidity
     * for nested pools is the sum of the price impacts of each remove liquidity
     * operation in the nested pools.
     * @param input same input used in the corresponding remove liquidity nested operation
     * @param nestedPoolState same nested pool state used in the corresponding remove liquidity nested operation
     * @returns price impact amount
     */
    static removeLiquidityNested = async (
        input: RemoveLiquidityNestedSingleTokenInput,
        nestedPoolState: NestedPoolState,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within RemoveLiquidity

        // simulate removing liquidity to get amounts out
        const removeLiquidityNested = new RemoveLiquidityNested();
        const { bptAmountIn, amountsOut } = await removeLiquidityNested.query(
            input,
            nestedPoolState,
        );

        // simulate adding liquidity to get amounts in
        const addLiquidityNested = new AddLiquidityNested();
        const addLiquidityNestedInput: AddLiquidityNestedInput = {
            accountAddress: input.accountAddress,
            chainId: input.chainId,
            rpcUrl: input.rpcUrl,
            useNativeAssetAsWrappedAmountIn:
                input.useNativeAssetAsWrappedAmountOut,
            fromInternalBalance: input.toInternalBalance,
            amountsIn: amountsOut.map((a) => a.toInputAmount()),
        };
        const { bptOut } = await addLiquidityNested.query(
            addLiquidityNestedInput,
            nestedPoolState,
        );

        // calculate price impact using ABA method
        return priceImpactABA(bptAmountIn, bptOut);
    };

    /**
     * Calculate price impact on single swap operations
     * @param input same input used in the corresponding single swap operation
     * @returns price impact amount
     */
    static singleSwap = async ({
        poolId,
        kind,
        assetIn,
        assetOut,
        amount,
        userData,
        rpcUrl,
        chainId,
    }: SingleSwapInput): Promise<PriceImpactAmount> => {
        // simulate swap in original direction
        const amountResult = await doSingleSwapQuery({
            poolId,
            kind,
            assetIn,
            assetOut,
            amount,
            userData,
            rpcUrl,
            chainId,
        });

        // simulate swap in the reverse direction
        const amountFinal = await doSingleSwapQuery({
            poolId: poolId,
            kind: kind,
            assetIn: assetOut,
            assetOut: assetIn,
            amount: amountResult,
            userData,
            rpcUrl,
            chainId,
        });

        // calculate price impact using ABA method
        const priceImpact = MathSol.divDownFixed(
            abs(amount - amountFinal),
            amount * 2n,
        );

        return PriceImpactAmount.fromRawAmount(priceImpact);
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
