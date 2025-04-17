import {
    type InputAmount,
    type MinimalToken,
    isSameAddress,
    MathSol,
    getSortedTokens,
    Token,
    TokenAmount,
} from 'src';
import { computeInitialBalanceRatio } from '@balancer-labs/balancer-maths';

export async function calculateReClammInitAmounts({
    chainId,
    tokens,
    givenAmountIn,
    initialMinPrice,
    initialMaxPrice,
    initialTargetPrice,
}: {
    tokens: MinimalToken[];
    chainId: number;
    givenAmountIn: InputAmount;
    initialMinPrice: bigint;
    initialMaxPrice: bigint;
    initialTargetPrice: bigint;
}): Promise<InputAmount[]> {
    // sort the user provided tokens
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

    let calculatedAmountIn: InputAmount;

    const givenToken = new Token(
        chainId,
        givenAmountIn.address,
        givenAmountIn.decimals,
    );
    const givenTokenAmountScaled18 = TokenAmount.fromRawAmount(
        givenToken,
        givenAmountIn.rawAmount,
    ).scale18;

    const calculatedToken = new Token(
        chainId,
        sortedTokens[calculatedTokenIndex].address,
        sortedTokens[calculatedTokenIndex].decimals,
    );

    // https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammPool.test.ts#L120-L128
    if (givenTokenIndex === 0) {
        // if given token is first in sort order, we multiply (math must be done in scaled 18)
        const rawAmountScaled18 = MathSol.mulDownFixed(
            givenTokenAmountScaled18,
            proportion,
        );
        // then convert back to token decimals raw amount (rounding down)
        const rawAmountScaledNative = TokenAmount.fromScale18Amount(
            calculatedToken,
            rawAmountScaled18,
        );
        calculatedAmountIn = {
            address: sortedTokens[1].address,
            rawAmount: rawAmountScaledNative.amount,
            decimals: tokens[1].decimals,
        };
    } else {
        // if given token is second in sort order, we divide (math must be done in scaled 18)
        const rawAmountScaled18 = MathSol.divDownFixed(
            givenTokenAmountScaled18,
            proportion,
        );
        // then convert back to token decimals raw amount (rounding down)
        const rawAmountScaledNative = TokenAmount.fromScale18Amount(
            calculatedToken,
            rawAmountScaled18,
        );
        calculatedAmountIn = {
            address: sortedTokens[0].address,
            rawAmount: rawAmountScaledNative.amount,
            decimals: sortedTokens[0].decimals,
        };
    }

    // Return amounts in consistent order based on token addresses
    return [givenAmountIn, calculatedAmountIn].sort((a, b) =>
        a.address.localeCompare(b.address),
    );
}
