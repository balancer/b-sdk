import { Token } from '../token';
import { TokenApi } from '../types';

export function getSortedTokens(tokens: TokenApi[], chainId: number): Token[] {
    return tokens
        .sort((a, b) => a.index - b.index)
        .map((t) => new Token(chainId, t.address, t.decimals));
}
