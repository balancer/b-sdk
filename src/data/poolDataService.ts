import { PoolDataEnricher, PoolDataProvider, RawPool } from './types';
import { SwapOptions } from '../types';

export class PoolDataService {
    constructor(
        private readonly providers: PoolDataProvider[],
        private readonly enrichers: PoolDataEnricher[],
    ) {}

    public async getEnrichedPools(options: SwapOptions): Promise<RawPool[]> {
        //TODO: might be necessary to remove duplicates, decide which take precendence
        const responses = await Promise.all(
            this.providers.map(provider => provider.getPools(options)),
        );

        let pools = responses.map(response => response.pools).flat();
        //we take the smallest block number from the set
        const syncedToBlockNumber = responses
            .map(response => response.syncedToBlockNumber || 0)
            .sort()[0];

        const additionalPoolData = await Promise.all(
            this.enrichers.map(provider =>
                provider.fetchAdditionalPoolData(pools, options, syncedToBlockNumber),
            ),
        );

        // We enrich the pools in order of the enrichers array
        for (let i = 0; i < this.enrichers.length; i++) {
            pools = this.enrichers[i].enrichPoolsWithData(pools, additionalPoolData[i]);
        }

        return pools;
    }
}
