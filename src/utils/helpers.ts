import { BigintIsh, Token, TokenAmount } from '../entities';
import { SwapKind } from '../types';

export function checkInputs(
    tokenIn: Token,
    tokenOut: Token,
    swapKind: SwapKind,
    swapAmount: BigintIsh | TokenAmount,
): TokenAmount {
    if (!(swapAmount instanceof TokenAmount)) {
        swapAmount = TokenAmount.fromRawAmount(
            swapKind === SwapKind.GivenIn ? tokenIn : tokenOut,
            swapAmount,
        );
    }
    if (
        tokenIn.chainId !== tokenOut.chainId ||
        tokenIn.chainId !== swapAmount.token.chainId
    ) {
        throw new Error('ChainId mismatch for inputs');
    }

    if (
        (swapKind === SwapKind.GivenIn && !tokenIn.isEqual(swapAmount.token)) ||
        (swapKind === SwapKind.GivenOut && !tokenOut.isEqual(swapAmount.token))
    ) {
        throw new Error('Swap amount token does not match input token');
    }

    return swapAmount;
}
