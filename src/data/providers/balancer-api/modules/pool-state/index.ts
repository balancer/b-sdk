import { BalancerApiClient } from '../../client';
import { PoolState, PoolStateWithBalances } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';
import { HumanAmount } from '@/data/types';

export class Pools {
    readonly poolStateQuery = `query GetPool($id: String!){
    poolGetPool(id:$id) {
      id
      address
      name
      type
      version
      vaultVersion
      ... on GqlPoolWeighted {
        tokens {
          ... on GqlPoolTokenBase {
            address
            decimals
            index
          }
        }
      }
      ... on GqlPoolMetaStable {
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
        vaultVersion
        dynamicData {totalShares}
        ... on GqlPoolWeighted {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
            }
          }
        }
        ... on GqlPoolMetaStable {
          tokens {
            ... on GqlPoolTokenBase {
              address
              decimals
              index
              balance
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
                id: id.toLowerCase(),
            },
        });
        const poolGetPool: PoolState = data.poolGetPool;
        return { ...poolGetPool, type: mapPoolType(poolGetPool.type) };
    }

    async fetchPoolStateWithBalances(
        id: string,
    ): Promise<PoolStateWithBalances> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.poolStateWithRawTokensQuery,
            variables: {
                id: id.toLowerCase(),
            },
        });
        const poolGetPool: PoolStateWithBalancesFromApi = data.poolGetPool;
        return {
            ...poolGetPool,
            type: mapPoolType(poolGetPool.type),
            totalShares: poolGetPool.dynamicData.totalShares,
        };
    }
}

type PoolStateWithBalancesFromApi = Omit<
    PoolStateWithBalances,
    'totalShares'
> & {
    dynamicData: { totalShares: HumanAmount };
};
