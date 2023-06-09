import { Address, Hex } from 'viem';
import { HumanAmount } from '../types';

// These are only the known pool types, additional pool types can be added via
// extension through custom PoolFactories and PoolDataProviders
export type SupportedRawPoolTypes =
    | LinearPoolType
    | 'Weighted'
    | 'Investment'
    | 'LiquidityBootstrapping'
    | 'Stable'
    | 'MetaStable'
    | 'ComposableStable'
    | 'StablePhantom'
    | 'Element'
    | 'Gyro2';
type LinearPoolType = `${string}Linear`;

export type RawPool =
    | RawBasePool
    | RawLinearPool
    | RawWeightedPool
    | RawStablePool
    | RawComposableStablePool
    | RawMetaStablePool
    | RawGyro2Pool;

export interface RawBasePool {
    id: Hex;
    address: Address;
    poolType: SupportedRawPoolTypes | string;
    poolTypeVersion: number;
    swapFee: HumanAmount;
    swapEnabled: boolean;
    tokens: RawPoolToken[];
    tokensList: Address[];
    liquidity: HumanAmount;
    totalShares: HumanAmount;
}

export interface RawLinearPool extends RawBasePool {
    poolType: LinearPoolType;
    mainIndex: number;
    wrappedIndex: number;
    lowerTarget: HumanAmount;
    upperTarget: HumanAmount;
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

export interface RawGyro2Pool extends RawBasePool {
    poolType: 'Gyro2';
    tokens: RawPoolToken[];
    sqrtAlpha: HumanAmount;
    sqrtBeta: HumanAmount;
}

export interface RawPoolToken {
    address: Address;
    index: number;
    symbol: string;
    name: string;
    decimals: number;
    balance: HumanAmount;
}

export interface RawWeightedPoolToken extends RawPoolToken {
    weight: HumanAmount;
}

export interface RawPoolTokenWithRate extends RawPoolToken {
    priceRate: HumanAmount;
}

export interface GetPoolsResponse {
    pools: RawPool[];
    syncedToBlockNumber?: bigint;
    poolsWithActiveAmpUpdates?: string[];
    poolsWithActiveWeightUpdates?: string[];
}

export interface ProviderSwapOptions {
    block?: bigint;
    timestamp: bigint;
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

    enrichPoolsWithData(
        pools: RawPool[],
        additionalPoolData: AdditionalPoolData[],
    ): RawPool[];
}

export interface AdditionalPoolData {
    id: string;
    [key: string]: any;
}
