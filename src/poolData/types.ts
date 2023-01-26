export interface RawPool {
    id: string;
    address: string;
    poolType: string;
    poolTypeVersion: number;
    amp: string;
    swapFee: string;
    swapEnabled: boolean;
    mainIndex: number;
    wrappedIndex: number;
    lowerTarget: string;
    upperTarget: string;
    tokens: RawPoolToken[];
    tokensList: string[];
    liquidity: string;
    totalShares: string;

    hasActiveAmpUpdate?: boolean;
    hasActiveWeightUpdate?: boolean;
}

export interface RawPoolToken {
    address: string;
    index: number;
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
    weight?: string;
    priceRate?: string;
}

export interface LoadPoolsOptions {
    block?: number;
}

export interface PoolDataProvider {
    getPools(
        options?: LoadPoolsOptions,
    ): Promise<{ pools: RawPool[]; syncedToBlockNumber?: number }>;
}

// Pool enrichment is split into two parts to allow for parallel fetching of additional
// data (ie: Promise.all). The pools are then enriched by the enrichers in order.
export interface PoolDataEnricher {
    fetchAdditionalPoolData(
        pools: RawPool[],
        syncedToBlockNumber?: number,
        options?: LoadPoolsOptions,
    ): Promise<AdditionalPoolData[]>;

    enrichPoolsWithData(pools: RawPool[], additionalPoolData: AdditionalPoolData[]): RawPool[];
}

export interface AdditionalPoolData {
    id: string;
    [key: string]: any;
}
