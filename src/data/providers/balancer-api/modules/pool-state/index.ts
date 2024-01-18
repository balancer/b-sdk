import { BalancerApiClient } from '../../client';
import { PoolState } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';

export class Pools {
    readonly poolStateQuery = `query GetPool($id: String!){
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
}
