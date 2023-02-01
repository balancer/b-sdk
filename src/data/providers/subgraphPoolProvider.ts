import { default as retry } from 'async-retry';
import Timeout from 'await-timeout';
import { gql, GraphQLClient } from 'graphql-request';
import { LoadPoolsOptions, PoolDataProvider, RawPool } from '../types';

const PAGE_SIZE = 1000;

interface PoolUpdate {
    poolId: {
        id: string;
    };
}

export class SubgraphPoolProvider implements PoolDataProvider {
    private client: GraphQLClient;

    constructor(private subgraphUrl: string, private retries = 2, private timeout = 30000) {
        this.client = new GraphQLClient(subgraphUrl);
    }

    public async getPools(
        options?: LoadPoolsOptions,
    ): Promise<{ pools: RawPool[]; syncedToBlockNumber: number }> {
        const timestamp = Math.floor(new Date().getTime() / 1000);
        const timestampMinusOneHour = timestamp - 3600;
        const timestampPlusOneHour = timestamp + 3600;

        const poolsFragment = this.getPoolsQueryFragment(options);

        const query = gql`
            query poolsQuery($pageSize: Int!, $id: String) {
                ${poolsFragment}
                gradualWeightUpdates(where: { endTimestamp_gte: ${timestampMinusOneHour}, startTimestamp_lte: ${timestampPlusOneHour} }) {
                    poolId {
                        id
                    }
                }
                ampUpdates(where: { endTimestamp_gte: ${timestampMinusOneHour}, startTimestamp_lte: ${timestampPlusOneHour} }) {
                    poolId {
                        id
                    }
                }
                swapFeeUpdates(where: { startTimestamp_gte: ${timestampMinusOneHour} }) {
                    pool {
                        id
                    }
                }
                _meta {
                    block {
                        number
                    }
                }
            }
        `;

        const queryWithoutUpdates = gql`
            query poolsQuery($pageSize: Int!, $id: String) {
                ${poolsFragment}
            }
        `;

        let pools: RawPool[] = [];
        let weightUpdates: PoolUpdate[] = [];
        let ampUpdates: PoolUpdate[] = [];
        let syncedToBlockNumber: number = 0;

        await retry(
            async () => {
                const timeout = new Timeout();

                const getPools = async (): Promise<RawPool[]> => {
                    let lastId: string = '';
                    let pools: RawPool[] = [];
                    let poolsPage: RawPool[] = [];

                    do {
                        const poolsResult = await this.client.request<{
                            pools: RawPool[];
                            gradualWeightUpdates?: PoolUpdate[];
                            ampUpdates?: PoolUpdate[];
                            _meta?: { block: { number: number } };
                        }>(lastId === '' ? query : queryWithoutUpdates, {
                            pageSize: PAGE_SIZE,
                            id: lastId,
                        });

                        poolsPage = poolsResult.pools;

                        pools = pools.concat(poolsPage);

                        if (lastId === '') {
                            ampUpdates = poolsResult.ampUpdates || [];
                            weightUpdates = poolsResult.gradualWeightUpdates || [];
                        }

                        if (poolsResult._meta) {
                            syncedToBlockNumber = poolsResult._meta.block.number;
                        }

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

        const filtered = pools.filter(
            pool =>
                pool.swapEnabled &&
                pool.totalShares !== '0' &&
                pool.totalShares !== '0.000000000001',
        );

        const poolsWithAmpUpdates = new Set(ampUpdates.map(update => update.poolId.id));
        const poolsWithWeightUpdates = new Set(weightUpdates.map(update => update.poolId.id));

        return {
            pools: filtered.map(pool => ({
                ...pool,
                hasActiveAmpUpdate: poolsWithAmpUpdates.has(pool.id),
                hasActiveWeightUpdate: poolsWithWeightUpdates.has(pool.id),
            })),
            syncedToBlockNumber,
        };
    }

    private getPoolsQueryFragment(options?: LoadPoolsOptions) {
        const blockQuery = options && options.block ? `block: { number: ${options.block} }` : '';

        return gql`
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
                    name
                    symbol
                    decimals
                }
                tokensList
                swapEnabled
                swapFee
                amp
                totalLiquidity
                totalShares
                mainIndex
                wrappedIndex
                lowerTarget
                upperTarget
            }
        `;
    }
}
