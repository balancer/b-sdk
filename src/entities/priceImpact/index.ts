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
import { RemoveLiquidityNested } from '../removeLiquidityNested';
import { RemoveLiquidityNestedSingleTokenInputV2 } from '../removeLiquidityNested/removeLiquidityNestedV2/types';
import { TokenAmount } from '../tokenAmount';
import { NestedPoolState, PoolState, PoolStateWithUnderlyings } from '../types';
import { getSortedTokens } from '../utils';
import { AddLiquidityNestedInput } from '../addLiquidityNested/types';
import { AddLiquidityNested } from '../addLiquidityNested';
import { AddLiquidityBoostedUnbalancedInput } from '../addLiquidityBoosted/types';
import { addLiquidityUnbalancedBoosted } from './addLiquidityUnbalancedBoosted';
import { addLiquidityNested } from './addLiquidityNested';
import { priceImpactABA } from './helper';
import { addLiquidityUnbalanced } from './addLiquidityUnbalanced';

export * from './helper';

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
        let amountsIn: TokenAmount[];
        try {
            const queryResult = await addLiquidity.query(input, poolState);
            amountsIn = queryResult.amountsIn;
        } catch (err) {
            throw new Error(
                `addLiquiditySingleToken operation will fail at SC level with user defined input.\n${err}`,
            );
        }

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
        return addLiquidityUnbalanced(input, poolState);
    };

    static async addLiquidityUnbalancedBoosted(
        input: AddLiquidityBoostedUnbalancedInput,
        poolState: PoolStateWithUnderlyings,
    ): Promise<PriceImpactAmount> {
        return addLiquidityUnbalancedBoosted(input, poolState);
    }

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
        return await addLiquidityNested(input, nestedPoolState);
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
        let amountsOut: TokenAmount[];
        let bptIn: TokenAmount;
        try {
            const queryResult = await removeLiquidity.query(input, poolState);
            amountsOut = queryResult.amountsOut;
            bptIn = queryResult.bptIn;
        } catch (err) {
            throw new Error(
                `removeLiquidity operation will fail at SC level with user defined input.\n${err}`,
            );
        }

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
        input: RemoveLiquidityNestedSingleTokenInputV2,
        nestedPoolState: NestedPoolState,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within RemoveLiquidity

        // simulate removing liquidity to get amounts out
        const removeLiquidityNested = new RemoveLiquidityNested();
        let amountsOut: TokenAmount[];
        let bptAmountIn: TokenAmount;
        try {
            const queryResult = await removeLiquidityNested.query(
                input,
                nestedPoolState,
            );
            amountsOut = queryResult.amountsOut;
            bptAmountIn = queryResult.bptAmountIn;
        } catch (err) {
            throw new Error(
                `removeLiquidity operation will fail at SC level with user defined input.\n${err}`,
            );
        }

        // simulate adding liquidity to get amounts in
        const addLiquidityNested = new AddLiquidityNested();
        const addLiquidityNestedInput: AddLiquidityNestedInput = {
            chainId: input.chainId,
            rpcUrl: input.rpcUrl,
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
}
