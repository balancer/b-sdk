import { MinimalTokenWithRate } from '../../data/types';
import { Token } from '../token';

export function getSortedTokens(
    tokens: MinimalTokenWithRate[],
    chainId: number,
): Token[] {
    return tokens
        .sort((a, b) => a.index - b.index)
        .map(
            (t) =>
                new Token(
                    chainId,
                    t.address,
                    t.decimals,
                    undefined,
                    undefined,
                    undefined,
                    t.rate,
                ),
        );
}
