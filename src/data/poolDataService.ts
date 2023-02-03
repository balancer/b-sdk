import {
    GetPoolsResponse,
    PoolDataEnricher,
    PoolDataProvider,
    ProviderSwapOptions,
    RawPool,
} from './types';
import { SwapOptions } from '../types';
import { jsonRpcGetBlockTimestampByNumber } from '../utils/jsonRpcFetch';

export class PoolDataService {
    constructor(
        private readonly providers: PoolDataProvider[],
        private readonly enrichers: PoolDataEnricher[],
        private readonly rpcUrl: string,
    ) {}

    public async getEnrichedPools(options: SwapOptions): Promise<RawPool[]> {
        const timestamp = options.block
            ? await jsonRpcGetBlockTimestampByNumber({
                  rpcUrl: this.rpcUrl,
                  blockNumber: options.block,
              })
            : Math.floor(new Date().getTime() / 1000);

        const providerOptions: ProviderSwapOptions = {
            ...options,
            timestamp,
        };

        //TODO: might be necessary to remove duplicates, decide which take precendence
        const responses = await Promise.all(
            this.providers.map(provider => provider.getPools(providerOptions)),
        );

        let pools = responses.map(response => response.pools).flat();

        const data: GetPoolsResponse = {
            pools: responses.map(response => response.pools).flat(),
            //we take the smallest block number from the set
            syncedToBlockNumber: responses
                .map(response => response.syncedToBlockNumber || 0)
                .sort()[0],
            poolsWithActiveWeightUpdates: responses
                .map(response => response.poolsWithActiveWeightUpdates || [])
                .flat(),
            poolsWithActiveAmpUpdates: responses
                .map(response => response.poolsWithActiveAmpUpdates || [])
                .flat(),
        };

        const additionalPoolData = await Promise.all(
            this.enrichers.map(provider => provider.fetchAdditionalPoolData(data, providerOptions)),
        );

        // We enrich the pools in order of the enrichers array
        for (let i = 0; i < this.enrichers.length; i++) {
            pools = this.enrichers[i].enrichPoolsWithData(pools, additionalPoolData[i]);
        }

        return pools;
    }
}
