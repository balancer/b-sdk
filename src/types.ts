import { BigintIsh, Token, BasePool, BasePoolFactory, TokenAmount, Swap } from './entities';
import { PoolDataEnricher, PoolDataProvider } from './data/types';
import { PathGraphTraversalConfig } from './pathGraph/pathGraphTypes';
import { Address, Hex } from 'viem';

export type SwapInputRawAmount = BigintIsh;

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
    block?: bigint;
    slippage?: bigint;
    funds?: FundManagement;
    deadline?: bigint;
    graphTraversalConfig?: Partial<PathGraphTraversalConfig>;
}

export interface FundManagement {
    sender: string;
    fromInternalBalance: boolean;
    recipient: boolean;
    toInternalBalance: boolean;
}

export type SorOptions = {
    minPercentForPath: number;
};

export type SorConfig = {
    chainId: number;
    options?: SorOptions;
    customPoolFactories?: BasePoolFactory[];
    poolDataProviders: PoolDataProvider | PoolDataProvider[];
    poolDataEnrichers?: PoolDataEnricher | PoolDataEnricher[];
    rpcUrl: string;
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
    poolId: Hex;
    kind: SwapKind;
    assetIn: Address;
    assetOut: Address;
    amount: bigint;
    userData: Hex;
}

export interface BatchSwapStep {
    poolId: Hex;
    assetInIndex: bigint;
    assetOutIndex: bigint;
    amount: bigint;
    userData: Hex;
}

export interface SwapInfo {
    quote: TokenAmount;
    swap: Swap;
    // gasPriceWei: BigNumber;
    // estimateTxGas: BigNumber;
    // transactionData: TransactionData;
}

export type HexString = `0x${string}`;

export interface Exit {
        poolId: HexString;
        sender: HexString;
        recipient: HexString;
        request: ExitPoolRequest;
}

 export interface ExitPoolRequest {
        assets: HexString[];
        minAmountsOut: bigint[]
        userData: HexString;
        toInternalBalance: boolean;
    }

export type ExitAction = {
    poolId: HexString;
    sender: HexString;
    recipient: HexString;
    assets: HexString[];
    toInternalBalance: boolean;
}

export type Actions = ExitAction | BatchSwapStep;

export type HumanAmount = `${number}`;
