import { LoadPoolsOptions, PoolDataEnricher, PoolDataProvider, RawPool } from './types';
import { poolSupportsGradualWeightUpdates } from '@/utils';

export class PoolDataService {
    constructor(
        private readonly providers: PoolDataProvider[],
        private readonly enrichers: PoolDataEnricher[],
    ) {}

    public async getEnrichedPools(options?: LoadPoolsOptions): Promise<RawPool[]> {
        //TODO: might be necessary to remove duplicates, decide which take precendence
        const responses = await Promise.all(
            this.providers.map(provider => provider.getPools(options)),
        );

        const poolsSupportingGradualWeightUpdatesToInclude =
            options?.poolsSupportingGradualWeightUpdatesToInclude || [];

        let pools = responses
            .map(response => response.pools)
            .flat()
            .filter(pool => {
                if (poolSupportsGradualWeightUpdates(pool.poolType)) {
                    return poolsSupportingGradualWeightUpdatesToInclude.includes(pool.id);
                }

                return true;
            });

        //we take the smallest block number from the set
        const syncedToBlockNumber = responses
            .map(response => response.syncedToBlockNumber || 0)
            .sort()[0];

        const additionalPoolData = await Promise.all(
            this.enrichers.map(provider =>
                provider.fetchAdditionalPoolData(pools, syncedToBlockNumber, options),
            ),
        );

        // We enrich the pools in order of the enrichers array
        for (let i = 0; i < this.enrichers.length; i++) {
            pools = this.enrichers[i].enrichPoolsWithData(pools, additionalPoolData[i]);
        }

        return pools;
    }

    private poolHasWeightUpdates(pool: RawPool) {
        return pool.poolType === 'LiquidityBootstrapping' || pool.poolType === 'Investment';
    }
}
