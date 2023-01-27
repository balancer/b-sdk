import { BigNumber } from '@ethersproject/bignumber';
import { Token, BasePool, BasePoolFactory } from './entities';
import { BaseProvider } from '@ethersproject/providers';
import { PoolDataEnricher, PoolDataProvider } from './data/types';

export enum PoolType {
    Weighted = 'Weighted',
    ComposableStable = 'ComposableStable',
    MetaStable = 'MetaStable',
    AaveLinear = 'AaveLinear',
}

export enum SwapKind {
    GivenIn = 0,
    GivenOut = 1,
}

export interface SwapOptions {
    block?: number;
    slippage?: BigNumber;
    funds?: FundManagement;
    deadline?: BigNumber;
    // pool types that support gradual weight updates (LBPs, investment pools, etc) are excluded
    // from SOR routing by default. This has the added benefit of limiting the amount of on chain
    // queries that need to be performed . To include any pool that supports a gradual weight
    // update, define them individually in the swap options
    poolsSupportingGradualWeightUpdatesToInclude?: string[];
}

export interface FundManagement {
    sender: string;
    fromInternalBalance: boolean;
    recipient: boolean;
    toInternalBalance: boolean;
}

export type SorOptions = {
    onchainBalances: boolean;
    minPercentForPath: number;
};

export type SorConfig = {
    chainId: number;
    provider: BaseProvider;
    options?: SorOptions;
    customPoolFactories?: BasePoolFactory[];
    poolDataProviders: PoolDataProvider | PoolDataProvider[];
    poolDataEnrichers?: PoolDataEnricher | PoolDataEnricher[];
};

export type PoolFilters = {
    topN: number;
};

export interface PoolTokenPair {
    id: string;
    pool: BasePool;
    tokenIn: Token;
    tokenOut: Token;
}

export interface SingleSwap {
    poolId: string;
    kind: SwapKind;
    assetIn: string;
    assetOut: string;
    amount: string;
    userData: string;
}

export interface BatchSwapStep {
    poolId: string;
    assetInIndex: number;
    assetOutIndex: number;
    amount: string;
    userData: string;
}
