import { Token } from '../entities/token';
import { TokenAmount, BigintIsh } from '../entities/tokenAmount';
import { Address, SwapKind } from '../types';

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

export function isSameAddress(address1: Address, address2: Address) {
    return address1.toLowerCase() === address2.toLowerCase();
}

export function removeIndex<T>(array: T[], index: number): T[] {
    return index === -1
        ? array
        : [...array.slice(0, index), ...array.slice(index + 1)];
}

export function insertIndex<T>(array: T[], index: number, value: T): T[] {
    return index === -1
        ? array
        : [...array.slice(0, index), value, ...array.slice(index)];
}
