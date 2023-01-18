import { default as retry } from 'async-retry';
import Timeout from 'await-timeout';
import { gql, GraphQLClient } from 'graphql-request';
import { SUBGRAPH_URLS } from './utils';
import { ChainId } from './utils';
import { SwapOptions } from './types';

export type SubgraphPoolToken = {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
    weight?: string;
    priceRate?: string;
};

export type SubgraphPool = {
    id: string;
    address: string;
    poolType: string;
    poolTypeVersion: number;
    amp: string;
    swapFee: string;
    swapEnabled: boolean;
    tokens: SubgraphPoolToken[];
    tokensList: string[];
    liquidity: string;
    totalShares: string;
};

export interface PoolDataService {
    getPools(swapOptions? : SwapOptions): Promise<SubgraphPool[]>;
}

const PAGE_SIZE = 1000;

export class SubgraphProvider implements PoolDataService {
    private client: GraphQLClient;

    constructor(private chainId: ChainId, private retries = 2, private timeout = 30000) {
        const subgraphUrl = SUBGRAPH_URLS[this.chainId];
        if (!subgraphUrl) {
            throw new Error(`No subgraph url for chain id: ${this.chainId}`);
        }
        this.client = new GraphQLClient(subgraphUrl);
    }

    public async getPools(swapOptions? : SwapOptions): Promise<SubgraphPool[]> {
        const blockQuery = swapOptions && swapOptions.block ? `block: { number: ${swapOptions.block} }` : '';
        const query = gql`
      query getPools($pageSize: Int!, $id: String) {
        pools(
          first: $pageSize
          where: { id_gt: $id }
          ${blockQuery}
        ) {
          id
          address
          poolType
          poolTypeVersion
          tokens {
            address
            balance
            weight
            priceRate
            decimals
          }
          tokensList
          swapEnabled
          swapFee
          amp
          totalLiquidity
          totalShares
        }
      }
    `;

        let pools: SubgraphPool[] = [];

        await retry(
            async () => {
                const timeout = new Timeout();

                const getPools = async (): Promise<SubgraphPool[]> => {
                    let lastId: string = '';
                    let pools: SubgraphPool[] = [];
                    let poolsPage: SubgraphPool[] = [];

                    do {
                        const poolsResult = await this.client.request<{
                            pools: SubgraphPool[];
                        }>(query, {
                            pageSize: PAGE_SIZE,
                            id: lastId,
                        });

                        poolsPage = poolsResult.pools;

                        pools = pools.concat(poolsPage);

                        lastId = pools[pools.length - 1]!.id;
                    } while (poolsPage.length === PAGE_SIZE);

                    return pools;
                };

                try {
                    const getPoolsPromise = getPools();
                    const timerPromise = timeout.set(this.timeout).then(() => {
                        throw new Error(`Timed out getting pools from subgraph: ${this.timeout}`);
                    });
                    pools = await Promise.race([getPoolsPromise, timerPromise]);
                    return;
                } finally {
                    timeout.clear();
                }
            },
            {
                retries: this.retries,
                onRetry: (err, retry) => {
                    console.log(err, retry);
                },
            },
        );

        return pools.filter(
            pool =>
                pool.swapEnabled &&
                pool.totalShares !== '0' &&
                pool.totalShares !== '0.000000000001',
        );
    }
}
