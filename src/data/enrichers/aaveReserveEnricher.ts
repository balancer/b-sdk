import { gql, GraphQLClient } from 'graphql-request';
import { default as retry } from 'async-retry';
import Timeout from 'await-timeout';
import { LoadPoolsOptions, PoolDataEnricher, RawPool } from '../types';
import { RAY, SECONDS_PER_YEAR, WAD } from '@/utils';
import { formatFixed } from '@ethersproject/bignumber';

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
        syncedToBlockNumber?: number,
        options?: LoadPoolsOptions,
    ): Promise<AaveReserve[]> {
        const query = gql`
            query getRates {
                reserves {
                    id
                    underlyingAsset
                    liquidityRate
                    liquidityIndex
                    lastUpdateTimestamp
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
                const mT = pool.tokens[pool.mainIndex];
                const rateData = additionalPoolData.find(r => r.underlyingAsset === mT.address);

                if (!rateData) {
                    console.error(
                        'Wrapped pool token does not have a price rate',
                        pool.id,
                        mT.address,
                    );
                    continue;
                }

                const rate = this.getNormalizedIncome(
                    BigInt(rateData.liquidityIndex.toString()),
                    BigInt(rateData.liquidityRate.toString()),
                    BigInt(rateData.lastUpdateTimestamp),
                );

                pool.tokens[pool.wrappedIndex].priceRate = formatFixed(rate.toString(), 18);
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
