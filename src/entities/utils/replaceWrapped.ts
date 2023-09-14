import { Token } from '../token';
import { NATIVE_ASSETS, ZERO_ADDRESS } from '../../utils';

export function replaceWrapped(tokens: Token[], chainId: number): Token[] {
    return tokens.map((token) => {
        if (token.isUnderlyingEqual(NATIVE_ASSETS[chainId])) {
            return new Token(chainId, ZERO_ADDRESS, 18);
        } else {
            return token;
        }
    });
}
