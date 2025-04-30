import { computeInitialBalanceRatio } from '@balancer-labs/balancer-maths';

import { InputAmount } from '@/types';
import { MinimalTokenWithRate } from '@/data/types';
import { getSortedTokens } from '@/entities/utils/getSortedTokens';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { TokenAmountWithRate } from '@/entities/tokenAmountWithRate';
import { isSameAddress } from './helpers';
import { MathSol, WAD } from './math';

export type CalculateReClammInitAmountInput = {
    chainId: number;
    tokens: MinimalTokenWithRate[];
    givenAmountIn: InputAmount;
    initialMinPrice: bigint;
    initialMaxPrice: bigint;
    initialTargetPrice: bigint;
};

export async function calculateReClammInitAmounts({
    chainId,
    tokens,
    givenAmountIn,
    initialMinPrice,
    initialMaxPrice,
    initialTargetPrice,
}: CalculateReClammInitAmountInput): Promise<InputAmount[]> {
    // sort the user provided tokens just in case
    const sortedTokens = getSortedTokens(tokens, chainId);
    const givenTokenIndex = sortedTokens.findIndex((t) =>
        isSameAddress(t.address, givenAmountIn.address),
    );
    const calculatedTokenIndex = givenTokenIndex === 0 ? 1 : 0;

    const proportion = computeInitialBalanceRatio(
        initialMinPrice,
        initialMaxPrice,
        initialTargetPrice,
    );

    // Create token instances for decimal scaling helpers
    const givenToken = new Token(
        chainId,
        givenAmountIn.address,
        givenAmountIn.decimals,
        undefined,
        undefined,
        undefined,
        sortedTokens[givenTokenIndex]?.rate,
    );
    const calculatedToken = new Token(
        chainId,
        sortedTokens[calculatedTokenIndex].address,
        sortedTokens[calculatedTokenIndex].decimals,
        undefined, // symbol
        undefined, // name
        undefined, // wrapped
        sortedTokens[calculatedTokenIndex]?.rate, // rate
    );

    // Scale given amount to 18 decimals before doing math
    const givenTokenAmount = givenToken.rate
        ? TokenAmountWithRate.fromRawAmountWithRate(
              givenToken,
              givenAmountIn.rawAmount,
              givenToken.rate,
          )
        : TokenAmount.fromRawAmount(givenToken, givenAmountIn.rawAmount);

    // Do math based on token order: https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammPool.test.ts#L120-L128
    const rawAmountScaled18 =
        givenTokenIndex === 0
            ? MathSol.mulDownFixed(givenTokenAmount.scale18, proportion) // if given token is first in sort order, we multiply
            : MathSol.divDownFixed(givenTokenAmount.scale18, proportion); // if given token is second in sort order, we divide'

    // Convert back to native token decimals of the calculated token (rounding down)
    const calculatedTokenScaledNative = calculatedToken.rate
        ? TokenAmountWithRate.fromScale18AmountWithRate(
              calculatedToken,
              rawAmountScaled18,
              calculatedToken.rate,
          )
        : TokenAmount.fromScale18Amount(calculatedToken, rawAmountScaled18);

    const calculatedAmountIn: InputAmount = {
        address: sortedTokens[calculatedTokenIndex].address,
        rawAmount: calculatedTokenScaledNative.amount,
        decimals: sortedTokens[calculatedTokenIndex].decimals,
    };

    // Return amounts in consistent order based on token addresses
    return [givenAmountIn, calculatedAmountIn].sort((a, b) =>
        a.address.localeCompare(b.address),
    );
}
