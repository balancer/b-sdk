// These are only the known pool types, additional pool types can be added via
// extension through custom PoolFactories and PoolDataProviders
import { SwapOptions } from '../types';

export type SupportedRawPoolTypes =
    | LinearPoolType
    | 'Weighted'
    | 'Investment'
    | 'LiquidityBootstrapping'
    | 'Stable'
    | 'MetaStable'
    | 'ComposableStable'
    | 'StablePhantom'
    | 'Element';
type LinearPoolType = `${string}Linear`;

export type RawPool =
    | RawBasePool
    | RawLinearPool
    | RawWeightedPool
    | RawStablePool
    | RawComposableStablePool
    | RawMetaStablePool;

export interface RawBasePool {
    id: SupportedRawPoolTypes | string;
    address: string;
    poolType: string;
    poolTypeVersion: number;
    swapFee: string;
    swapEnabled: boolean;
    tokens: RawPoolToken[];
    tokensList: string[];
    liquidity: string;
    totalShares: string;
}

export interface RawLinearPool extends RawBasePool {
    poolType: LinearPoolType;
    mainIndex: number;
    wrappedIndex: number;
    lowerTarget: string;
    upperTarget: string;
    tokens: RawPoolTokenWithRate[];
}

export interface RawBaseStablePool extends RawBasePool {
    amp: string;
}

export interface RawStablePool extends RawBaseStablePool {
    poolType: 'Stable';
}

export interface RawComposableStablePool extends RawBaseStablePool {
    poolType: 'ComposableStable' | 'StablePhantom';
    tokens: RawPoolTokenWithRate[];
}

export interface RawMetaStablePool extends RawBaseStablePool {
    poolType: 'MetaStable';
    tokens: RawPoolTokenWithRate[];
}

export interface RawWeightedPool extends RawBasePool {
    poolType: 'Weighted' | 'Investment' | 'LiquidityBootstrapping';
    tokens: RawWeightedPoolToken[];
    hasActiveWeightUpdate?: boolean;
}

export interface RawPoolToken {
    address: string;
    index: number;
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
}

export interface RawWeightedPoolToken extends RawPoolToken {
    weight: string;
}

export interface RawPoolTokenWithRate extends RawPoolToken {
    priceRate: string;
}

export interface GetPoolsResponse {
    pools: RawPool[];
    syncedToBlockNumber?: number;
    poolsWithActiveAmpUpdates?: string[];
    poolsWithActiveWeightUpdates?: string[];
}

export interface ProviderSwapOptions extends SwapOptions {
    timestamp: number;
}

export interface PoolDataProvider {
    getPools(options: ProviderSwapOptions): Promise<GetPoolsResponse>;
}

// Pool enrichment is split into two parts to allow for parallel fetching of additional
// data (ie: Promise.all). The pools are then enriched by the enrichers in order.
export interface PoolDataEnricher {
    fetchAdditionalPoolData(
        data: GetPoolsResponse,
        options: ProviderSwapOptions,
    ): Promise<AdditionalPoolData[]>;

    enrichPoolsWithData(pools: RawPool[], additionalPoolData: AdditionalPoolData[]): RawPool[];
}

export interface AdditionalPoolData {
    id: string;
    [key: string]: any;
}
