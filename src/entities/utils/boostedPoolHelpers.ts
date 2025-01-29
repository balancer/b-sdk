import { MinimalToken } from '@/data/types';
import { PoolStateWithUnderlyings } from '@/entities/types';
import { Address } from 'viem';

export type MinimalTokenWithIsUnderlyingFlag = MinimalToken & {
    isUnderlyingToken: boolean;
};

/**
 * Builds map of pool tokens (including underlying ) with address as key
 * and token details as values like...
 *
 */
export function buildPoolStateTokenMap(
    poolState: PoolStateWithUnderlyings,
): Record<Address, MinimalTokenWithIsUnderlyingFlag> {
    const map: Record<Address, MinimalTokenWithIsUnderlyingFlag> = {};

    poolState.tokens.forEach((t) => {
        const underlyingToken = t.underlyingToken;
        map[t.address.toLowerCase()] = {
            index: t.index,
            decimals: t.decimals,
            address: t.address,
            isUnderlyingToken: false,
        };
        if (underlyingToken) {
            map[underlyingToken.address.toLowerCase()] = {
                index: underlyingToken.index,
                decimals: underlyingToken.decimals,
                address: underlyingToken.address,
                isUnderlyingToken: true,
            };
        }
    });

    return map;
}
