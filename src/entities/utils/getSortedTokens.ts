import { MinimalToken } from '../../data/types';
import { BaseToken } from '../baseToken';

export function getSortedTokens(
    tokens: MinimalToken[],
    chainId: number,
): BaseToken[] {
    return tokens
        .sort((a, b) => a.index - b.index)
        .map((t) => new BaseToken(chainId, t.address, t.decimals));
}
