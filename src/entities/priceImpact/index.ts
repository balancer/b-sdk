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
import { NestedPoolState, PoolState } from '../types';
import { getSortedTokens } from '../utils';
import { InputAmount, SingleSwap, SwapKind } from '../../types';
import { SingleSwapInput, doSingleSwapQuery } from '../utils/doSingleSwapQuery';
import { RemoveLiquidityNestedSingleTokenInput } from '../removeLiquidityNested/types';
import { RemoveLiquidityNested } from '../removeLiquidityNested';
import { AddLiquidityNested } from '../addLiquidityNested';
import { AddLiquidityNestedInput } from '../addLiquidityNested/types';

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
        const amountInitial = parseFloat(amountsIn[tokenIndex].toSignificant());
        const amountFinal = parseFloat(amountsOut[tokenIndex].toSignificant());

        // calculate price impact using ABA method
        const priceImpact = (amountInitial - amountFinal) / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
    };

    /**
     * Calculate price impact on add liquidity unbalanced operations
     *
     * Note: works on both balancer v2 and v3
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

    /**
     * Alternative for calculating price impact on add liquidity unbalanced operations
     *
     * Note: works on balancer v2 only because it relies on Remove Liquidity Unbalanced
     * @param input same input used in the corresponding add liquidity operation
     * @param poolState same pool state used in the corresponding add liquidity operation
     * @returns price impact amount
     */
    static addLiquidityUnbalancedAlternative = async (
        input: AddLiquidityUnbalancedInput,
        poolState: PoolState,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within AddLiquidity
        if (poolState.balancerVersion !== 2) {
            throw new Error(
                'This alternative method relies on Remove Liquidity Unbalanced, which is only available for balancer V2.',
            );
        }

        // simulate adding liquidity to get amounts in and bptOut
        const addLiquidity = new AddLiquidity();
        const { amountsIn, bptOut } = await addLiquidity.query(
            input,
            poolState,
        );

        // simulate removing liquidity exact out to get bptIn
        const removeLiquidity = new RemoveLiquidity();
        const removeLiquidityInput: RemoveLiquidityInput = {
            chainId: input.chainId,
            rpcUrl: input.rpcUrl,
            amountsOut: amountsIn.map((a) => a.toInputAmount()),
            kind: RemoveLiquidityKind.Unbalanced,
        };
        const { bptIn } = await removeLiquidity.query(
            removeLiquidityInput,
            poolState,
        );

        // get relevant amounts for price impact calculation
        const amountInitial = parseFloat(formatUnits(bptOut.amount, 18));
        const amountDelta = parseFloat(
            formatUnits(bptIn.amount - bptOut.amount, 18),
        );

        // calculate price impact using ABA method
        const priceImpact = amountDelta / amountInitial / 2;

        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
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

        // get relevant amounts for price impact calculation
        const amountInitial = parseFloat(bptIn.toSignificant());
        const amountFinal = parseFloat(bptOut.toSignificant());

        // calculate price impact using ABA method
        const priceImpact = (amountInitial - amountFinal) / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
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

        // get relevant amounts for price impact calculation
        const amountInitial = parseFloat(bptAmountIn.toSignificant());
        const amountFinal = parseFloat(bptOut.toSignificant());

        // calculate price impact using ABA method
        const priceImpact = (amountInitial - amountFinal) / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
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
