import { MathSol } from '@/utils';
import { PriceImpactAmount } from '../priceImpactAmount';
import { TokenAmount } from '../tokenAmount';

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
