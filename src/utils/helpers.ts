import { Token } from '../entities/token';
import { TokenAmount, BigintIsh } from '../entities/tokenAmount';
import { SwapKind } from '../types';

export function checkInputs(
    tokenIn: Token,
    tokenOut: Token,
    swapKind: SwapKind,
    swapAmount: BigintIsh | TokenAmount,
): TokenAmount {
    let amount: TokenAmount;

    if (swapAmount instanceof TokenAmount) {
        amount = swapAmount;
    } else {
        amount = TokenAmount.fromRawAmount(
            swapKind === SwapKind.GivenIn ? tokenIn : tokenOut,
            swapAmount,
        );
    }

    if (
        tokenIn.chainId !== tokenOut.chainId ||
        tokenIn.chainId !== amount.token.chainId
    ) {
        throw new Error('ChainId mismatch for inputs');
    }

    if (
        (swapKind === SwapKind.GivenIn && !tokenIn.isEqual(amount.token)) ||
        (swapKind === SwapKind.GivenOut && !tokenOut.isEqual(amount.token))
    ) {
        throw new Error('Swap amount token does not match input token');
    }

    return amount;
}
