import { Address } from 'viem';
import { isSameAddress } from '@/utils';
import { PoolTokenWithUnderlying } from '../types';
import { MinimalToken } from '@/data';

function isPoolTokenWithUnderlying(
    token: PoolTokenWithUnderlying | MinimalToken,
): token is PoolTokenWithUnderlying {
    return 'underlyingToken' in token;
}

/**
 * Check if token is either a pool token or underlying pool token.
 * @param tokens
 * @param token
 * @returns
 */
export function isPoolToken(
    tokens: PoolTokenWithUnderlying[] | MinimalToken[],
    token: Address,
): { isPoolToken: boolean; isUnderlyingToken: boolean } {
    let isPoolToken = false;
    let isUnderlyingToken = false;

    tokens.some((t) => {
        const isToken = isSameAddress(t.address, token);
        const isUnderlying =
            isPoolTokenWithUnderlying(t) &&
            t.underlyingToken &&
            isSameAddress(t.underlyingToken.address, token);

        if (isToken || isUnderlying) {
            isPoolToken = true;
            isUnderlyingToken = !!isUnderlying;
            return true;
        }

        return false;
    });

    return { isPoolToken, isUnderlyingToken };
}
