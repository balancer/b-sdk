import { Path } from '@/entities/swap';
import { BalancerApiClient } from '../../client';

export class SorGetQuote {
    // TODO - Update with real query
    readonly sorGetQuoteQuery = `query GetPool($id: String!){
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

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    // TODO - Replace with real when available
    // async fetchSorGetQuote(id: string): Promise<PoolState> {
    //     const { data } = await this.balancerApiClient.fetch({
    //         query: this.sorGetQuoteQuery,
    //         variables: {
    //             id,
    //         },
    //     });
    //     const poolGetPool: PoolState = data.poolGetPool;
    //     return { ...poolGetPool, type: mapPoolType(poolGetPool.type) };
    // }

    /**
    API Returns list of GqlSorPath:

    type GqlSorPath {
      balancerVersion: Int!
      pools: [String]! --- note can this be address?
      tokens: [Token]!
      outputAmountRaw: String!
      inputAmountRaw: String!
    }

    type Token {
        address: String!
        decimals: Int!
    }
    */
    async fetchSorGetQuote(): Promise<Path[]> {
        return [
            {
                balancerVersion: 2,
                pools: [
                    '0xc2aa60465bffa1a88f5ba471a59ca0435c3ec5c100020000000000000000062c',
                ],
                // tokens should be in swap order
                tokens: [
                    {
                        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        decimals: 6,
                    },
                    {
                        address: '0xe07f9d810a48ab5c3c914ba3ca53af14e4491e8a',
                        decimals: 18,
                    },
                ],
                inputAmountRaw: 1000000n,
                outputAmountRaw: 1000000000000000000n,
            },
        ];
    }
}
