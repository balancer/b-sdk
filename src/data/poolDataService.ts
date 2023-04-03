import {
    GetPoolsResponse,
    PoolDataEnricher,
    PoolDataProvider,
    ProviderSwapOptions,
    RawPool,
} from './types';
import { createPublicClient, http } from 'viem';

export class PoolDataService {
    constructor(
        private readonly providers: PoolDataProvider[],
        private readonly enrichers: PoolDataEnricher[],
        private readonly rpcUrl: string,
    ) {}

    public async fetchEnrichedPools(
        blockNumber?: bigint,
    ): Promise<{ rawPools: RawPool[]; providerData: GetPoolsResponse }> {
        const providerOptions: ProviderSwapOptions = {
            block: blockNumber,
            timestamp: await this.getTimestampForBlockNumber(blockNumber),
        };

        //TODO: might be necessary to remove duplicates, decide which take precendence
        const responses = await Promise.all(
            this.providers.map(provider => provider.getPools(providerOptions)),
        );

        const providerData: GetPoolsResponse = {
            pools: responses.flatMap(response => response.pools),
            //we take the smallest block number from the set
            syncedToBlockNumber: responses
                .map(response => response.syncedToBlockNumber || 0n)
                .sort()[0],
            poolsWithActiveWeightUpdates: responses
                .flatMap(response => response.poolsWithActiveWeightUpdates || []),
            poolsWithActiveAmpUpdates: responses
                .flatMap(response => response.poolsWithActiveAmpUpdates || []),
        };

        return {
            rawPools: await this.enrichPools(providerData, providerOptions),
            providerData,
        };
    }

    public async enrichPools(data: GetPoolsResponse, providerOptions: ProviderSwapOptions) {
        let pools = data.pools;

        const additionalPoolData = await Promise.all(
            this.enrichers.map(provider => provider.fetchAdditionalPoolData(data, providerOptions)),
        );

        // We enrich the pools in order of the enrichers array
        for (let i = 0; i < this.enrichers.length; i++) {
            pools = this.enrichers[i].enrichPoolsWithData(pools, additionalPoolData[i]);
        }

        return pools;
    }

    public async getTimestampForBlockNumber(blockNumber?: bigint) {
        if (blockNumber) {
            const client = createPublicClient({
                transport: http(this.rpcUrl),
            });

            return (await client.getBlock({ blockNumber })).timestamp;
        } else {
            return BigInt(Math.floor(new Date().getTime() / 1000));
        }
    }
}
