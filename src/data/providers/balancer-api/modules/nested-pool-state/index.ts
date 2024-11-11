import { BalancerApiClient } from '../../client';
import {
    NestedPoolState,
    NestedPoolV2,
    NestedPoolV3,
    PoolTokenWithUnderlying,
} from '../../../../../entities';
import { Address, Hex } from '../../../../../types';
import { mapPoolType } from '@/utils/poolTypeMapper';
import { API_CHAIN_NAMES, isSameAddress } from '@/utils';

export type PoolGetPool = {
    id: Hex;
    protocolVersion: 1 | 2 | 3;
    address: Address;
    type: string;
    poolTokens: Token[];
};

export type UnderlyingToken = {
    address: Address;
    decimals: number;
};

export type Token = {
    index: number;
    address: Address;
    decimals: number;
    underlyingToken: UnderlyingToken | null;
    nestedPool: {
        id: Hex;
        address: Address;
        type: string;
        tokens: Token[];
    } | null;
};

export class NestedPools {
    readonly nestedPoolStateQuery = `
  query GetPool($id: String!, $chain: GqlChain!) {
    poolGetPool(id: $id, chain: $chain) {
      id
      protocolVersion
      address
      type
      poolTokens {
        index
        address
        decimals
        nestedPool {
          id
          address
          type
          tokens {
            index
            address
            decimals
            underlyingToken {
              address
              decimals
            }
          }
        }
        underlyingToken {
          address
          decimals
        }
      }
    }
  }
`;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    fetchNestedPoolState = async (id: string): Promise<NestedPoolState> => {
        const {
            data: { poolGetPool },
        } = await this.balancerApiClient.fetch({
            query: this.nestedPoolStateQuery,
            variables: {
                id: id.toLowerCase(),
                // the API requires chain names to be sent as uppercase strings
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });

        const nestedPoolState = this.mapPoolToNestedPoolState(
            poolGetPool as PoolGetPool,
        );

        return nestedPoolState;
    };

    mapPoolToNestedPoolState = (pool: PoolGetPool): NestedPoolState => {
        return pool.protocolVersion === 2
            ? mapPoolToNestedPoolStateV2(pool)
            : mapPoolToNestedPoolStateV3(pool);
    };
}

export function mapPoolToNestedPoolStateV3(pool: PoolGetPool): NestedPoolState {
    const pools: NestedPoolV3[] = [
        {
            id: pool.id,
            address: pool.address,
            type: mapPoolType(pool.type),
            level: 1,
            tokens: pool.poolTokens.map((t) => {
                const minimalToken: PoolTokenWithUnderlying = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                    underlyingToken:
                        t.underlyingToken === null
                            ? null
                            : { ...t.underlyingToken, index: t.index },
                };
                return minimalToken;
            }),
        },
    ];

    pool.poolTokens.forEach((token) => {
        // Token represents nested pools only if they have a nestedPool property
        // Filter out phantomBpt
        if (
            !token.nestedPool ||
            isSameAddress(pool.address, token.nestedPool.address)
        )
            return;

        // map API result to NestedPool
        pools.push({
            id: token.nestedPool.id,
            address: token.nestedPool.address,
            level: 0,
            type: mapPoolType(token.nestedPool.type),
            tokens: token.nestedPool.tokens.map((t) => {
                const minimalToken: PoolTokenWithUnderlying = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                    underlyingToken:
                        t.underlyingToken === null
                            ? null
                            : { ...t.underlyingToken, index: t.index },
                };
                return minimalToken;
            }),
        });
    });

    const poolTokens = pool.poolTokens;

    const mainTokens = poolTokens.flatMap((token) => {
        if (token.nestedPool) {
            // If it's a nested pool, process all tokens in the pool
            return token.nestedPool.tokens.map(getMainToken);
        }
        // Otherwise just get the main token
        return [getMainToken(token)];
    });

    return {
        protocolVersion: pool.protocolVersion,
        pools,
        mainTokens,
    };
}

function getMainToken(token: Token): {
    address: Address;
    decimals: number;
    index: number;
} {
    // If token has an underlying token, use that
    if (token.underlyingToken) {
        return {
            index: token.index,
            address: token.underlyingToken.address,
            decimals: token.underlyingToken.decimals,
        };
    }

    // If no underlying token or nested pool, use the token itself
    if (!token.nestedPool) {
        return {
            index: token.index,
            address: token.address,
            decimals: token.decimals,
        };
    }

    // If there's a nested pool, process all its tokens
    const nestedTokens = token.nestedPool.tokens.map(getMainToken);
    return nestedTokens[0]; // Return the first token as this is part of an array anyway
}

export function mapPoolToNestedPoolStateV2(pool: PoolGetPool): NestedPoolState {
    const pools: NestedPoolV2[] = [
        {
            id: pool.id,
            address: pool.address,
            type: mapPoolType(pool.type),
            level: 1,
            tokens: pool.poolTokens.map((t) => {
                const minimalToken: PoolTokenWithUnderlying = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                    underlyingToken:
                        t.underlyingToken === null
                            ? null
                            : { ...t.underlyingToken, index: t.index },
                };
                return minimalToken;
            }),
        },
    ];

    pool.poolTokens.forEach((token) => {
        // Token represents nested pools only if they have a nestedPool property
        // Filter out phantomBpt
        if (
            !token.nestedPool ||
            isSameAddress(pool.address, token.nestedPool.address)
        )
            return;

        // map API result to NestedPool
        pools.push({
            id: token.nestedPool.id,
            address: token.nestedPool.address,
            level: 0,
            type: mapPoolType(token.nestedPool.type),
            tokens: token.nestedPool.tokens.map((t) => {
                const minimalToken: PoolTokenWithUnderlying = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                    underlyingToken:
                        t.underlyingToken === null
                            ? null
                            : { ...t.underlyingToken, index: t.index },
                };
                return minimalToken;
            }),
        });
    });

    // mainTokens are pool tokens filtering out nested pools and phantomBPTs
    const mainTokens = pool.poolTokens.flatMap((t) => {
        if (t.nestedPool) {
            const nestedPool = t.nestedPool;
            return nestedPool.tokens
                .filter((t) => t.address !== nestedPool.address) // remove phantomBPT
                .map((t) => {
                    return {
                        address: t.address,
                        decimals: t.decimals,
                    };
                });
        }

        return {
            address: t.address,
            decimals: t.decimals,
        };
    });

    return {
        protocolVersion: 2,
        pools,
        mainTokens,
    };
}
