import { BalancerApiClient } from '../../client';
import { PoolState } from './types';

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
      ... on GqlPoolPhantomStable {
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
    const {
      data: { poolGetPool },
    } = await this.balancerApiClient.fetch('GetPool', this.poolStateQuery, {
      id,
    });
    return poolGetPool;
  }
}
