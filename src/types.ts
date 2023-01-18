import { BigNumber } from '@ethersproject/bignumber';
import { SubgraphProvider } from './poolProvider';
import { Token, TokenAmount, BasePool, BasePoolFactory } from './entities';

export enum PoolType {
    Weighted = 'Weighted',
    Investment = 'Investment',
    Stable = 'Stable',
    ComposableStable = 'ComposableStable',
    MetaStable = 'MetaStable',
    StablePhantom = 'StablePhantom',
    LiquidityBootstrapping = 'LiquidityBootstrapping',
    AaveLinear = 'AaveLinear',
    ERC4626Linear = 'ERC4626Linear',
    Element = 'Element',
    Gyro2 = 'Gyro2',
    Gyro3 = 'Gyro3',
}

export enum SwapKind {
    GivenIn = 0,
    GivenOut = 1,
}

export type SorOptions = {
    onchainBalances: boolean;
    minPercentForPath: number;
};

export type SorConfig = {
    chainId: number;
    poolProvider: SubgraphProvider;
    options?: SorOptions;
    customPoolFactories?: BasePoolFactory[];
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

export interface BatchSwapStep {
    poolId: string;
    assetInIndex: number;
    assetOutIndex: number;
    amount: string;
    userData: string;
}
