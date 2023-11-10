import { BalancerApiClient } from '../../client';
import { PoolStateInput } from '../../../../../entities';

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

    async fetchPoolState(id: string): Promise<PoolStateInput> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.poolStateQuery,
            variables: {
                id,
            },
        });
        const poolGetPool: PoolStateInput = data.poolGetPool;

        if (poolGetPool.type === 'PHANTOM_STABLE') {
            if (
                !poolGetPool.tokens.some(
                    (t) => t.address === poolGetPool.address,
                )
            ) {
                /**
                 * TODO:
                 * We are working on assumption that API will return BPT token in token list (as current SG does)
                 * If it doesn't (as of 09/11/23) we have to add it manually
                 */
                let missingBPTIndex = 0;
                const sortedIndexes = poolGetPool.tokens
                    .map((t) => t.index)
                    .sort();
                for (let i = 0; i < poolGetPool.tokens.length + 1; i++) {
                    if (
                        i === poolGetPool.tokens.length ||
                        sortedIndexes[i] !== i
                    ) {
                        missingBPTIndex = i;
                        break;
                    }
                }
                poolGetPool.tokens.splice(missingBPTIndex, 0, {
                    index: missingBPTIndex,
                    address: poolGetPool.address,
                    decimals: 18,
                });
            }
        }
        return poolGetPool;
    }
}
