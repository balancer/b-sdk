import { BalancerApiClient } from '../../client';
import { PoolState, PoolStateWithRawTokens } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';

export class Pools {
    readonly poolStateQuery = `query GetPool($id: String!){
    poolGetPool(id:$id) {
      id
      address
      name
      type
      version
      balancerVersion:vaultVersion
      ... on GqlPoolWeighted {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
      ... on GqlPoolStable {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
      ... on GqlPoolComposableStable {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
      ... on GqlPoolGyro {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
      ... on GqlPoolLiquidityBootstrapping {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
      ... on GqlPoolElement {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
      ... on GqlPoolLiquidityBootstrapping {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
    }
}`;

    readonly poolStateWithRawTokensQuery = `
    query GetPool($id: String!){
      poolGetPool(id:$id) {
        id
        address
        name
        type
        version
        ... on GqlPoolWeighted {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
              name
              symbol
            }
          }
        }
        ... on GqlPoolStable {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
              name
              symbol
            }
          }
        }
        ... on GqlPoolComposableStable {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
              name
              symbol
            }
          }
        }
        ... on GqlPoolGyro {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
              name
              symbol
            }
          }
        }
        ... on GqlPoolLiquidityBootstrapping {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
              name
              symbol
            }
          }
        }
        ... on GqlPoolElement {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
              name
              symbol
            }
          }
        }
        ... on GqlPoolLiquidityBootstrapping {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
              name
              symbol
            }
          }
        }
      }
    }`;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    async fetchPoolState(id: string): Promise<PoolState> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.poolStateQuery,
            variables: {
                id,
            },
        });
        const poolGetPool: PoolState = data.poolGetPool;
        return { ...poolGetPool, type: mapPoolType(poolGetPool.type) };
    }

    async fetchPoolStateWithRawTokens(
        id: string,
    ): Promise<PoolStateWithRawTokens> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.poolStateWithRawTokensQuery,
            variables: {
                id,
            },
        });
        const poolGetPool: PoolStateWithRawTokens = data.poolGetPool;
        return { ...poolGetPool, type: mapPoolType(poolGetPool.type) };
    }
}
