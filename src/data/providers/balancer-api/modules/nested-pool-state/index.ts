import { BalancerApiClient } from '../../client';
import { NestedPool, NestedPoolState } from '../../../../../entities';
import { MinimalToken } from '../../../../types';
import { Address, Hex, PoolType } from '../../../../../types';

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
            ... on GqlPoolTokenPhantomStable {
              ...GqlPoolTokenPhantomStable
            }
          }
        }
        ... on GqlPoolPhantomStable {
          amp
          nestingType
          tokens {
            ... on GqlPoolToken {
              ...GqlPoolToken
            }
            ... on GqlPoolTokenLinear {
              ...GqlPoolTokenLinear
            }
            ... on GqlPoolTokenPhantomStable {
              ...GqlPoolTokenPhantomStable
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
            ... on GqlPoolTokenPhantomStable {
              ...GqlPoolTokenPhantomStable
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
    
    fragment GqlPoolTokenPhantomStable on GqlPoolTokenPhantomStable {
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
        const pools: NestedPool[] = [
            {
                id: pool.id,
                address: pool.address,
                type: this.mapPoolType(pool.type),
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

            /**
             * TODO: Current development API has included BPT token in nested pools,
             * but they are still deciding if that will be reverted.
             * If they include it -> remove commented code
             * If they don't -> uncomment code to apply hack
             */
            // // hack to add BPT token missing from nested pools on API result
            // let missingBPTIndex = 0;
            // const sortedIndexes = token.pool.tokens.map((t) => t.index).sort();
            // for (let i = 0; i < token.pool.tokens.length + 1; i++) {
            //     if (i === token.pool.tokens.length || sortedIndexes[i] !== i) {
            //         missingBPTIndex = i;
            //     }
            // }
            // token.pool.tokens.splice(missingBPTIndex, 0, {
            //     index: missingBPTIndex,
            //     name: 'BPT',
            //     symbol: 'BPT',
            //     address: token.pool.address,
            //     decimals: 18,
            // });

            // map API result to NestedPool
            pools.push({
                id: token.pool.id,
                address: token.pool.address,
                level: 0,
                type: this.mapPoolType(token.pool.type),
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
    };

    mapPoolType = (type: string): PoolType => {
        switch (type) {
            case 'WEIGHTED':
                return PoolType.Weighted;
            case 'PHANTOM_STABLE':
                return PoolType.ComposableStable;
            default:
                throw new Error(`Unsupported pool type ${type}`);
        }
    };
}
