import {
    GetPoolsResponse,
    PoolDataProvider,
    ProviderSwapOptions,
    RawPool,
} from '../types';
import { fetchWithRetry } from '../../utils/fetch';
import { SUBGRAPH_URLS } from '../../utils';

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

const PAGE_SIZE = 1000;
const SECS_IN_HOUR = 3600n;

interface PoolUpdate {
    poolId: {
        id: string;
    };
}

interface SubgraphPoolProviderConfig {
    retries: number;
    timeout: number;
    //pool type and id filters
    poolTypeIn?: string[];
    poolTypeNotIn?: string[];
    poolIdIn?: string[];
    poolIdNotIn?: string[];
    // whether to include a query for active gradualWeightUpdates
    loadActiveWeightUpdates?: boolean;
    // whether to include a query for active ampUpdates
    loadActiveAmpUpdates?: boolean;
    // whether to apply pool filtering on the gql query or in code. Depending on the subgraph
    // endpoint, it is sometimes more efficient to query the full data set and filter post.
    addFilterToPoolQuery?: boolean;
    // if you need to fetch additional pool fields, you can provide them here.
    // this field is typed as a string to allow for the expansion of nested field values
    gqlAdditionalPoolQueryFields?: string;
}

export class SubgraphPoolProvider implements PoolDataProvider {
    private readonly url: string;
    private readonly config: SubgraphPoolProviderConfig;

    constructor(
        chainId: number,
        subgraphUrl?: string,
        config?: Partial<SubgraphPoolProviderConfig>,
    ) {
        // if subgraphUrl isnt provided, use the default for the chainId
        const defaultSubgraphUrl = SUBGRAPH_URLS[chainId];
        this.url = subgraphUrl ?? defaultSubgraphUrl;

        const hasFilterConfig =
            config &&
            (config.poolIdNotIn ||
                config.poolIdIn ||
                config.poolTypeIn ||
                config.poolTypeNotIn);

        this.config = {
            retries: 2,
            timeout: 30000,
            loadActiveAmpUpdates: true,
            // we assume a public subgraph is being used, so default to false
            addFilterToPoolQuery: false,
            // by default, we exclude pool types with weight updates.
            // if any filtering config is provided, this exclusion is removed.
            poolTypeNotIn: !hasFilterConfig
                ? ['Investment', 'LiquidityBootstrapping']
                : undefined,
            ...config,
        };
    }

    public async getPools(
        options: ProviderSwapOptions,
    ): Promise<GetPoolsResponse> {
        const response = await fetchWithRetry<GetPoolsResponse>(() =>
            this.fetchDataFromSubgraph(options),
        );

        return {
            ...response,
            pools: response?.pools || [],
            syncedToBlockNumber: response?.syncedToBlockNumber || 0n,
        };
    }

    private async fetchDataFromSubgraph(
        options: ProviderSwapOptions,
    ): Promise<GetPoolsResponse> {
        let ampUpdates: PoolUpdate[] = [];
        let syncedToBlockNumber: bigint = 0n;
        let lastId: string = '';
        let pools: RawPool[] = [];
        let poolsPage: RawPool[] = [];
        const nowMinusOneHour = options.timestamp - SECS_IN_HOUR;
        const nowPlusOneHour = options.timestamp + SECS_IN_HOUR;

        do {
            const query = this.getPoolsQuery(lastId === '');
            const variables = {
                pageSize: PAGE_SIZE,
                where: {
                    id_gt: lastId || undefined,
                    ...(this.config.addFilterToPoolQuery
                        ? {
                              totalShares_gt: 0.000000000001,
                              swapEnabled: true,
                              poolType_in: this.config.poolTypeIn,
                              poolType_not_in: this.config.poolTypeNotIn,
                              id_in: this.config.poolIdIn,
                              id_not_in: this.config.poolIdNotIn,
                          }
                        : {}),
                },
                ...(options?.block
                    ? {
                          block: {
                              number: Number(options.block),
                          },
                      }
                    : {}),
                ampUpdatesWhere: {
                    endTimestamp_gte: nowMinusOneHour,
                    startTimestamp_lte: nowPlusOneHour,
                },
                weightedUpdatesWhere: {
                    endTimestamp_gte: nowMinusOneHour,
                    startTimestamp_lte: nowPlusOneHour,
                },
            };

            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables,
                }),
            });

            const poolsResult = await response.json();

            poolsPage = poolsResult.data.pools;
            pools = pools.concat(poolsPage);

            if (lastId === '') {
                ampUpdates = poolsResult.ampUpdates || [];
            }

            if (poolsResult._meta) {
                syncedToBlockNumber = BigInt(poolsResult._meta.block.number);
            }

            lastId = pools[pools.length - 1]!.id;
        } while (poolsPage.length === PAGE_SIZE);

        // we apply the filter after querying if not set in the config
        if (!this.config.addFilterToPoolQuery) {
            pools = pools.filter((pool) => this.poolMatchesFilter(pool));
        }

        return {
            pools,
            poolsWithActiveAmpUpdates: ampUpdates.map(
                (update) => update.poolId.id,
            ),
            syncedToBlockNumber,
        };
    }

    private getPoolsQuery(isFirstQuery: boolean) {
        const {
            loadActiveAmpUpdates,
            loadActiveWeightUpdates,
            gqlAdditionalPoolQueryFields,
        } = this.config;

        const blockNumberFragment = `
            _meta {
                block {
                    number
                }
            }
        `;

        const ampUpdatesFragment = `
            ampUpdates(where: $ampUpdatesWhere) {
                poolId {
                    id
                }
            }
        `;

        const weightUpdatesFragment = `
            gradualWeightUpdates(where: $weightedUpdatesWhere) {
                poolId {
                    id
                }
            }
        `;

        return `
            query poolsQuery(
                $pageSize: Int!
                $where: Pool_filter
                $block: Block_height
                $ampUpdatesWhere: AmpUpdate_filter
                $weightedUpdatesWhere: GradualWeightUpdate_filter
            ) {
                pools(first: $pageSize, where: $where, block: $block) {
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
                        name
                        index
                        symbol
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
                    ${gqlAdditionalPoolQueryFields || ''}
                }
                ${isFirstQuery ? blockNumberFragment : ''}
                ${
                    isFirstQuery && loadActiveAmpUpdates
                        ? ampUpdatesFragment
                        : ''
                }
                ${
                    isFirstQuery && loadActiveWeightUpdates
                        ? weightUpdatesFragment
                        : ''
                }
            }
        `;
    }

    private poolMatchesFilter(pool: RawPool) {
        if (
            !pool.swapEnabled ||
            pool.totalShares === '0.000000000001' ||
            pool.totalShares === '0'
        ) {
            return false;
        }

        if (
            this.config.poolTypeIn &&
            !this.config.poolTypeIn.includes(pool.poolType)
        ) {
            return false;
        }

        if (this.config.poolTypeNotIn?.includes(pool.poolType)) {
            return false;
        }

        if (this.config.poolIdIn && !this.config.poolIdIn.includes(pool.id)) {
            return false;
        }

        if (this.config.poolIdNotIn?.includes(pool.id)) {
            return false;
        }

        return true;
    }
}
