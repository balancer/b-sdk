import { NATIVE_ASSETS, ZERO_ADDRESS } from '@/utils';
import { Address } from 'viem';

export function replaceWrapped(tokens: Address[], chainId: number): Address[] {
    return tokens.map((token) => {
        if (
            NATIVE_ASSETS[chainId].wrapped.toLowerCase() === token.toLowerCase()
        ) {
            return ZERO_ADDRESS;
        }
        return token;
    });
}
