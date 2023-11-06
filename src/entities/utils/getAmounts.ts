import { InputAmount } from '../../types';
import { Token } from '../token';

/**
 * Get amounts from array of TokenAmounts returning default if not a value for tokens.
 * @param tokens
 * @param amounts
 * @param defaultAmount
 * @returns
 */
export function getAmounts(
    tokens: Token[],
    amounts: InputAmount[],
    defaultAmount = 0n,
): bigint[] {
    return tokens.map(
        (t) =>
            amounts.find((a) => t.isSameAddress(a.address))?.rawAmount ??
            defaultAmount,
    );
}
