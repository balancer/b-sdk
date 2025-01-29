import { MinimalToken } from '@/data/types';
import { PoolStateWithUnderlyings } from '@/entities/types';
import { Address } from 'viem';

export type MinimalTokenWithIsUnderlyingFlag = MinimalToken & {
    isUnderlyingToken: boolean;
};

/**
 * Builds map of pool tokens (including underlying)
 * with address as key and useful token details as values.
 *
 * Example output:
 * {
 *   "0x8a88124522dbbf1e56352ba3de1d9f78c143751e": {
 *     index: 0,
 *     decimals: 6,
 *     address: "0x8a88124522dbbf1e56352ba3de1d9f78c143751e",
 *     isUnderlyingToken: false
 *   },
 *   "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8": {
 *     index: 0,
 *     decimals: 6,
 *     address: "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8",
 *     isUnderlyingToken: true
 *   },
 *   "0x978206fae13faf5a8d293fb614326b237684b750": {
 *     index: 1,
 *     decimals: 6,
 *     address: "0x978206fae13faf5a8d293fb614326b237684b750",
 *     isUnderlyingToken: false
 *   },
 *   "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0": {
 *     index: 1,
 *     decimals: 6,
 *     address: "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0",
 *     isUnderlyingToken: true
 *   }
 * }
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
