import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';

/**
 * Get amounts from array of TokenAmounts returning default if not a value for tokens.
 * @param tokens
 * @param amounts
 * @param defaultAmount
 * @returns
 */
export function getAmounts(
    tokens: Token[],
    amounts: TokenAmount[],
    defaultAmount = 0n,
): bigint[] {
    return tokens.map(
        (t) => amounts.find((a) => a.token.isEqual(t))?.amount ?? defaultAmount,
    );
}
