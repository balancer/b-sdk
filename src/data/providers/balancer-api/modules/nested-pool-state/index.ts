import { BalancerApiClient } from '../../client';
import { NestedPool, NestedPoolState } from '../../../../../entities';
import { MinimalToken } from '../../../../types';
import { Address, Hex } from '../../../../../types';
import { mapPoolType } from '@/utils/poolTypeMapper';

type PoolGetPool = {
    id: Hex;
    address: Address;
    name: string;
    type: string;
    version: string;
    nestingType: string;
    allTokens: {
        address: Address;
        name: string;
        symbol: string;
        decimals: number;
        isMainToken: boolean;
    }[];
    tokens: {
        index: number;
        name: string;
        symbol: string;
        address: Address;
        decimals: number;
        pool?: {
            id: Hex;
            name: string;
            symbol: string;
            address: Address;
            type: string;
            tokens: {
                index: number;
                name: string;
                symbol: string;
                address: Address;
                decimals: number;
            }[];
        };
    }[];
};

export class NestedPools {
    readonly nestedPoolStateQuery = `
    query GetPool($id: String!){
      poolGetPool(id:$id) {
        id
        address
        name
        type
        version
        balancerVersion:vaultVersion
        allTokens {
          id
          address
          name
          symbol
          decimals
          isNested
          isPhantomBpt
          isMainToken
        }
        ... on GqlPoolWeighted {
          nestingType
          tokens {
            ... on GqlPoolToken {
              ...GqlPoolToken
            }
            ... on GqlPoolTokenLinear {
              ...GqlPoolTokenLinear
            }
            ... on GqlPoolTokenComposableStable {
              ...GqlPoolTokenComposableStable
            }
          }
        }
        ... on GqlPoolComposableStable {
          amp
          nestingType
          tokens {
            ... on GqlPoolToken {
              ...GqlPoolToken
            }
            ... on GqlPoolTokenLinear {
              ...GqlPoolTokenLinear
            }
            ... on GqlPoolTokenComposableStable {
              ...GqlPoolTokenComposableStable
            }
          }
        }
        ... on GqlPoolLiquidityBootstrapping {
          name
          nestingType
          tokens {
            ... on GqlPoolToken {
              ...GqlPoolToken
            }
            ... on GqlPoolTokenLinear {
              ...GqlPoolTokenLinear
            }
            ... on GqlPoolTokenComposableStable {
              ...GqlPoolTokenComposableStable
            }
          }
        }
      }
    }

    fragment GqlPoolToken on GqlPoolToken {
      index
      name
      symbol
      address
      decimals
    }

    fragment GqlPoolTokenLinear on GqlPoolTokenLinear {
      index
      name
      symbol
      address
      decimals
      pool {
        id
        name
        symbol
        address
        type
        tokens {
          ... on GqlPoolToken {
            ...GqlPoolToken
          }
        }
      }
    }

    fragment GqlPoolTokenComposableStable on GqlPoolTokenComposableStable {
      index
      name
      symbol
      address
      decimals
      pool {
        id
        name
        symbol
        address
        type
        tokens {
          ... on GqlPoolToken {
            ...GqlPoolToken
          }
          ... on GqlPoolTokenLinear {
            ...GqlPoolTokenLinear
          }
        }
      }
    }`;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    fetchNestedPoolState = async (id: string): Promise<NestedPoolState> => {
        const {
            data: { poolGetPool },
        } = await this.balancerApiClient.fetch({
            query: this.nestedPoolStateQuery,
            variables: {
                id,
            },
        });

        const nestedPoolState = this.mapPoolToNestedPoolState(
            poolGetPool as PoolGetPool,
        );

        return nestedPoolState;
    };

    mapPoolToNestedPoolState = (pool: PoolGetPool): NestedPoolState => {
        return mapPoolToNestedPoolState(pool);
    };
}

export function mapPoolToNestedPoolState(pool: PoolGetPool): NestedPoolState {
    const pools: NestedPool[] = [
        {
            id: pool.id,
            address: pool.address,
            type: mapPoolType(pool.type),
            level: 1,
            tokens: pool.tokens.map((t) => {
                const minimalToken: MinimalToken = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                };
                return minimalToken;
            }),
        },
    ];

    pool.tokens.forEach((token) => {
        // Token represents nested pools only nested if they have a pool property
        if (token.pool === undefined) return;

        // map API result to NestedPool
        pools.push({
            id: token.pool.id,
            address: token.pool.address,
            level: 0,
            type: mapPoolType(token.pool.type),
            tokens: token.pool.tokens.map((t) => {
                const minimalToken: MinimalToken = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                };
                return minimalToken;
            }),
        });
    });

    const mainTokens = pool.allTokens
        .filter((t) => t.isMainToken)
        .map((t) => {
            return {
                address: t.address,
                decimals: t.decimals,
            };
        });

    return {
        pools,
        mainTokens,
    } as NestedPoolState;
}
