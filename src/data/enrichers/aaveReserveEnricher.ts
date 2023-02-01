import { gql, GraphQLClient } from 'graphql-request';
import { default as retry } from 'async-retry';
import Timeout from 'await-timeout';
import { PoolDataEnricher, RawLinearPool, RawPool } from '../types';
import { RAY, SECONDS_PER_YEAR, WAD } from '../../utils';
import { formatFixed } from '@ethersproject/bignumber';
import { SwapOptions } from '../../types';

interface AaveReserve {
    id: string;
    underlyingAsset: string;
    liquidityRate: string;
    liquidityIndex: string;
    lastUpdateTimestamp: string;
}

export class AaveReserveEnricher implements PoolDataEnricher {
    private aaveClient: GraphQLClient;

    constructor(private retries = 2, private timeout = 30000) {
        this.aaveClient = new GraphQLClient(
            'https://api.thegraph.com/subgraphs/name/aave/protocol-v2',
        );
    }

    public async fetchAdditionalPoolData(
        pools: RawPool[],
        options: SwapOptions,
        syncedToBlockNumber?: number,
    ): Promise<AaveReserve[]> {
        const blockQuery = options && options.block ? `block: { number: ${options.block} }` : '';

        // This assumes that the aave reserve with the most liqudity matches the aToken Balancer uses
        // Since later a [].find() is used to get the first matching underlying token
        // Prevents an intermediate wrapped token -> aToken call since this isn't stored in the subgraph
        const query = gql`
            query getRates {
                reserves(orderBy: totalLiquidity, orderDirection: desc) {
                    id
                    underlyingAsset
                    liquidityRate
                    liquidityIndex
                    lastUpdateTimestamp
                    totalLiquidity
                }
            }
        `;

        let rates: AaveReserve[] = [];

        await retry(
            async () => {
                const timeout = new Timeout();

                const getRates = async (): Promise<AaveReserve[]> => {
                    const ratesResult = await this.aaveClient.request<{
                        reserves: AaveReserve[];
                    }>(query, {});

                    return ratesResult.reserves;
                };

                try {
                    const getRatesPromise = getRates();
                    const timerPromise = timeout.set(this.timeout).then(() => {
                        throw new Error(`Timed out getting rates from subgraph: ${this.timeout}`);
                    });
                    rates = await Promise.race([getRatesPromise, timerPromise]);
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

        return rates;
    }

    public enrichPoolsWithData(pools: RawPool[], additionalPoolData: AaveReserve[]): RawPool[] {
        for (const pool of pools) {
            if (pool.poolType === 'AaveLinear') {
                const linearPool = pool as RawLinearPool;
                const mT = linearPool.tokens[linearPool.mainIndex];
                const rateData = additionalPoolData.find(r => r.underlyingAsset === mT.address);

                if (!rateData) {
                    console.error(
                        'Wrapped pool token does not have a price rate',
                        linearPool.id,
                        mT.address,
                    );
                    continue;
                }

                const rate = this.getNormalizedIncome(
                    BigInt(rateData.liquidityIndex.toString()),
                    BigInt(rateData.liquidityRate.toString()),
                    BigInt(rateData.lastUpdateTimestamp),
                );

                linearPool.tokens[linearPool.wrappedIndex].priceRate = formatFixed(
                    rate.toString(),
                    18,
                );
            }
        }

        return pools;
    }

    private getNormalizedIncome(
        liquidityIndex: bigint,
        currentLiquidityRate: bigint,
        lastUpdateTimestamp: bigint,
    ): bigint {
        return (
            (this.calculateLinearInterest(currentLiquidityRate, lastUpdateTimestamp) *
                liquidityIndex) /
            RAY /
            (RAY / WAD)
        );
    }

    private calculateLinearInterest(rate: bigint, lastUpdateTimestamp: bigint): bigint {
        const timeDifference =
            BigInt(Math.floor(new Date().getTime() / 1000)) - lastUpdateTimestamp;
        return (rate * timeDifference) / SECONDS_PER_YEAR + RAY;
    }
}
