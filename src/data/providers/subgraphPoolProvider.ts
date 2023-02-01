import { gql, GraphQLClient } from 'graphql-request';
import { GetPoolsResponse, PoolDataProvider, RawPool } from '../types';
import { SwapOptions } from '../../types';
import { fetchWithRetry } from '../../utils/fetch';

const PAGE_SIZE = 1000;
const SECS_IN_HOUR = 3600;

interface PoolUpdate {
    poolId: {
        id: string;
    };
}

interface SubgraphPoolProviderConfig {
    retries: number;
    timeout: number;
    poolTypeIn?: string[];
    poolTypeNotIn?: string[];
    poolIdIn?: string[];
    poolIdNotIn?: string[];
    loadActiveAmpUpdates?: boolean;
    loadActiveWeightUpdates?: boolean;
    // if you need to fetch additional pool fields, you can provide them here.
    // this field is typed as a string to allow for the expansion of nested field values
    gqlAdditionalPoolQueryFields?: string;
}

export class SubgraphPoolProvider implements PoolDataProvider {
    private client: GraphQLClient;
    private readonly config: SubgraphPoolProviderConfig;

    constructor(subgraphUrl: string, config?: Partial<SubgraphPoolProviderConfig>) {
        this.client = new GraphQLClient(subgraphUrl);
        const hasFilterConfig =
            config &&
            (config.poolIdNotIn || config.poolIdIn || config.poolTypeIn || config.poolTypeNotIn);

        this.config = {
            retries: 2,
            timeout: 30000,
            loadActiveAmpUpdates: true,
            // by default, we exclude pool types with weight updates.
            // if any filtering config is provided, this exclusion is removed.
            poolTypeNotIn: !hasFilterConfig ? ['Investment', 'LiquidityBootstrapping'] : undefined,
            ...config,
        };
    }

    public async getPools(options?: SwapOptions): Promise<GetPoolsResponse> {
        const response = await fetchWithRetry<GetPoolsResponse>(() =>
            this.fetchDataFromSubgraph(options),
        );

        return {
            ...response,
            pools: response?.pools || [],
            syncedToBlockNumber: response?.syncedToBlockNumber || 0,
        };
    }

    private async fetchDataFromSubgraph(options?: SwapOptions): Promise<GetPoolsResponse> {
        let ampUpdates: PoolUpdate[] = [];
        let syncedToBlockNumber: number = 0;
        let lastId: string = '';
        let pools: RawPool[] = [];
        let poolsPage: RawPool[] = [];
        const timestamp = Math.floor(new Date().getTime() / 1000);
        const nowMinusOneHour =
            Math.round((timestamp - SECS_IN_HOUR) / SECS_IN_HOUR) * SECS_IN_HOUR;
        const nowPlusOneHour = Math.round((timestamp + SECS_IN_HOUR) / SECS_IN_HOUR) * SECS_IN_HOUR;

        do {
            const poolsResult = await this.client.request<{
                pools: RawPool[];
                gradualWeightUpdates?: PoolUpdate[];
                ampUpdates?: PoolUpdate[];
                _meta?: { block: { number: number } };
            }>(this.getPoolsQuery(lastId === ''), {
                pageSize: PAGE_SIZE,
                where: {
                    id: lastId || undefined,
                    totalShares_gt: 0.000000000001,
                    swapEnabled: true,
                    poolType_in: this.config.poolTypeIn,
                    poolType_not_in: this.config.poolTypeNotIn,
                    id_in: this.config.poolIdIn,
                    id_not_in: this.config.poolIdNotIn,
                },
                block: {
                    number: options?.block,
                },
                ampUpdatesWhere: {
                    endTimestamp_gte: nowMinusOneHour,
                    startTimestamp_lte: nowPlusOneHour,
                },
                weightedUpdatesWhere: {
                    endTimestamp_gte: nowMinusOneHour,
                    startTimestamp_lte: nowPlusOneHour,
                },
            });

            poolsPage = poolsResult.pools;
            pools = pools.concat(poolsPage);

            if (lastId === '') {
                ampUpdates = poolsResult.ampUpdates || [];
            }

            if (poolsResult._meta) {
                syncedToBlockNumber = poolsResult._meta.block.number;
            }

            lastId = pools[pools.length - 1]!.id;
        } while (poolsPage.length === PAGE_SIZE);

        console.log(pools[0]);

        return {
            pools,
            poolsWithActiveAmpUpdates: ampUpdates.map(update => update.poolId.id),
            syncedToBlockNumber,
        };
    }

    private getPoolsQuery(isFirstQuery: boolean) {
        const { loadActiveAmpUpdates, loadActiveWeightUpdates, gqlAdditionalPoolQueryFields } =
            this.config;

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

        return gql`
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
                ${isFirstQuery && loadActiveAmpUpdates ? ampUpdatesFragment : ''}
                ${isFirstQuery && loadActiveWeightUpdates ? weightUpdatesFragment : ''}
            }
        `;
    }
}
