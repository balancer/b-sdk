import {
    type InputAmount,
    type MinimalToken,
    type CreatePoolReClammInput,
    isSameAddress,
    MathSol,
} from 'src';
import { computeInitialBalanceRatio } from '@balancer-labs/balancer-maths';

export async function calculateReClammInitAmounts({
    tokens,
    givenAmountIn,
    createPoolInput,
}: {
    tokens: MinimalToken[];
    givenAmountIn: InputAmount;
    createPoolInput: CreatePoolReClammInput;
}): Promise<InputAmount[]> {
    // sort the user provided tokens
    const sortedTokens = tokens.sort((a, b) =>
        a.address.localeCompare(b.address),
    );

    const { initialMinPrice, initialMaxPrice, initialTargetPrice } =
        createPoolInput;

    const givenTokenIndex = sortedTokens.findIndex((t) =>
        isSameAddress(t.address, givenAmountIn.address),
    );

    const proportion = computeInitialBalanceRatio(
        initialMinPrice,
        initialMaxPrice,
        initialTargetPrice,
    );

    let calculatedAmountIn: InputAmount;

    // https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammPool.test.ts#L120-L128
    if (givenTokenIndex === 0) {
        // if chosen token is first in sort order, we multiply
        calculatedAmountIn = {
            address: sortedTokens[1].address,
            rawAmount: MathSol.mulDownFixed(
                givenAmountIn.rawAmount,
                proportion,
            ),
            decimals: tokens[1].decimals,
        };
    } else {
        // if chosen token is second in sort order, we divide
        calculatedAmountIn = {
            address: sortedTokens[0].address,
            rawAmount: MathSol.divDownFixed(
                givenAmountIn.rawAmount,
                proportion,
            ),
            decimals: sortedTokens[0].decimals,
        };
    }

    // Return amounts in consistent order based on token addresses
    return [givenAmountIn, calculatedAmountIn].sort((a, b) =>
        a.address.localeCompare(b.address),
    );
}
