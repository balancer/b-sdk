import { inputValidationError } from './errors';
import { Token } from '../entities/token';
import { TokenAmount } from '../entities/tokenAmount';
import { Address, SwapKind, BigintIsh } from '@/types';

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
        throw inputValidationError(
            'Swap',
            'tokenIn, tokenOut and amount should have the same chainId',
        );
    }

    if (
        (swapKind === SwapKind.GivenIn && !tokenIn.isEqual(amount.token)) ||
        (swapKind === SwapKind.GivenOut && !tokenOut.isEqual(amount.token))
    ) {
        throw inputValidationError(
            'Swap',
            `Swap amount token ${
                amount.token.address
            } does not match input token ${
                swapKind === SwapKind.GivenIn
                    ? tokenIn.address
                    : tokenOut.address
            }`,
        );
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
