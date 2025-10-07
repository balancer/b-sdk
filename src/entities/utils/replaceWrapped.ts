import { BaseToken } from '../baseToken';
import { Token } from '../token';
import { NATIVE_ASSETS, ZERO_ADDRESS } from '../../utils';

export function replaceWrapped(
    tokens: BaseToken[],
    chainId: number,
): BaseToken[] {
    return tokens.map((token) => {
        if (token.isSameAddress(NATIVE_ASSETS[chainId].wrapped)) {
            return new BaseToken(chainId, ZERO_ADDRESS, 18);
        }
        return token;
    });
}
