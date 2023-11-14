import { MinimalToken } from '../../data/types';
import { Token } from '../token';

export function getSortedTokens(
    tokens: MinimalToken[],
    chainId: number,
): Token[] {
    return tokens
        .sort((a, b) => a.index - b.index)
        .map((t) => new Token(chainId, t.address, t.decimals));
}
