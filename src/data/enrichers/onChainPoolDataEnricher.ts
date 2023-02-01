import BalancerSorQueriesAbi from '../../abi/BalancerSorQueries.json';
import {
    LoadPoolsOptions,
    PoolDataEnricher,
    RawPool,
    RawLinearPool,
    RawBaseStablePool,
} from '../types';
import { Interface } from '@ethersproject/abi';
import { jsonRpcFetch } from '../../utils/jsonRpcFetch';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';

interface OnChainPoolData {
    id: string;
    balances: BigNumber[];
    totalSupply: BigNumber;
    swapFee?: BigNumber;

    amp?: BigNumber;
    weights?: BigNumber[];
    wrappedTokenRate?: BigNumber;
}

enum TotalSupplyType {
    TOTAL_SUPPLY = 0,
    VIRTUAL_SUPPLY,
    ACTUAL_SUPPLY,
}

enum SwapFeeType {
    SWAP_FEE_PERCENTAGE = 0,
    PERCENT_FEE,
}

interface SorPoolDataQueryConfig {
    loadTokenBalanceUpdatesAfterBlock: boolean;
    loadTotalSupply: boolean;
    loadSwapFees: boolean;
    loadLinearWrappedTokenRates: boolean;
    loadNormalizedWeights: boolean;
    loadTokenRates: boolean;
    loadAmps: boolean;
    blockNumber: number;
    totalSupplyTypes: TotalSupplyType[];
    swapFeeTypes: SwapFeeType[];
    linearPoolIdxs: number[];
    weightedPoolIdxs: number[];
    tokenRatePoolIdxs: number[];
    ampPoolIdxs: number[];
}

export class OnChainPoolDataEnricher implements PoolDataEnricher {
    private readonly sorQueriesInterface: Interface;

    constructor(
        private readonly vaultAddress: string,
        private readonly sorQueriesAddress: string,
        private readonly rpcUrl: string,
    ) {
        this.sorQueriesInterface = new Interface(BalancerSorQueriesAbi);
    }

    public async fetchAdditionalPoolData(
        rawPools: RawPool[],
        syncedToBlockNumber?: number,
        options?: LoadPoolsOptions,
    ): Promise<OnChainPoolData[]> {
        if (rawPools.length === 0) {
            return [];
        }

        const { poolIds, config } = this.getPoolDataQueryParams(rawPools, syncedToBlockNumber);

        const { balances, amps, linearWrappedTokenRates, totalSupplies, weights } =
            await this.fetchOnChainPoolData({ poolIds, config, options });

        return poolIds.map((poolId, i) => ({
            id: poolIds[i],
            balances: balances[i],
            totalSupply: totalSupplies[i],
            weights: config.weightedPoolIdxs.includes(i)
                ? weights[config.weightedPoolIdxs.indexOf(i)]
                : undefined,
            amp: config.ampPoolIdxs.includes(i) ? amps[config.ampPoolIdxs.indexOf(i)] : undefined,
            wrappedTokenRate: config.linearPoolIdxs.includes(i)
                ? linearWrappedTokenRates[config.linearPoolIdxs.indexOf(i)]
                : undefined,
        }));
    }

    public enrichPoolsWithData(pools: RawPool[], additionalPoolData: OnChainPoolData[]): RawPool[] {
        return pools.map(pool => {
            const data = additionalPoolData.find(item => item.id === pool.id);

            return {
                ...pool,
                tokens: pool.tokens.map((token, idx) => ({
                    ...token,
                    balance:
                        data?.balances && data.balances.length > 0
                            ? formatFixed(data.balances[idx], token.decimals)
                            : token.balance,
                    priceRate:
                        data?.wrappedTokenRate && (pool as RawLinearPool).wrappedIndex === idx
                            ? formatFixed(data.wrappedTokenRate, 18)
                            : token.priceRate,
                    weight: data?.weights ? formatFixed(data.weights[idx], 18) : token.weight,
                })),
                totalShares: data?.totalSupply
                    ? formatFixed(data.totalSupply, 18)
                    : pool.totalShares,
                amp: data?.amp
                    ? formatFixed(data.amp, 3).split('.')[0]
                    : (pool as RawBaseStablePool).amp,
            };
        });
    }

    private getPoolDataQueryParams(
        rawPools: RawPool[],
        syncedToBlockNumber?: number,
    ): { poolIds: string[]; config: SorPoolDataQueryConfig } {
        const poolIds: string[] = [];
        const totalSupplyTypes: TotalSupplyType[] = [];
        const linearPoolIdxs: number[] = [];
        const weightedPoolIdxs: number[] = [];
        const ampPoolIdxs: number[] = [];

        for (let i = 0; i < rawPools.length; i++) {
            const pool = rawPools[i];

            poolIds.push(pool.id);
            totalSupplyTypes.push(
                pool.poolType === 'PhantomStable' || this.isLinearPoolType(pool.poolType)
                    ? TotalSupplyType.VIRTUAL_SUPPLY
                    : pool.poolType === 'ComposableStable'
                    ? TotalSupplyType.ACTUAL_SUPPLY
                    : TotalSupplyType.TOTAL_SUPPLY,
            );

            if (this.isLinearPoolType(pool.poolType)) {
                linearPoolIdxs.push(i);
            }
        }

        return {
            poolIds,
            config: {
                loadTokenBalanceUpdatesAfterBlock: true,
                loadTotalSupply: true,
                loadLinearWrappedTokenRates: true,
                loadNormalizedWeights: true,
                loadAmps: true,
                loadSwapFees: false,
                loadTokenRates: false,

                blockNumber: syncedToBlockNumber || 0,
                totalSupplyTypes,
                linearPoolIdxs,
                weightedPoolIdxs,
                ampPoolIdxs,
                tokenRatePoolIdxs: [],
                swapFeeTypes: [],
            },
        };
    }

    private async fetchOnChainPoolData({
        poolIds,
        config,
        options,
    }: {
        poolIds: string[];
        config: SorPoolDataQueryConfig;
        options?: LoadPoolsOptions;
    }) {
        return jsonRpcFetch<{
            balances: BigNumber[][];
            totalSupplies: BigNumber[];
            swapFees: BigNumber[];
            linearWrappedTokenRates: BigNumber[];
            weights: BigNumber[][];
            tokenRates: BigNumber[][];
            amps: BigNumber[];
        }>({
            rpcUrl: this.rpcUrl,
            to: this.sorQueriesAddress,
            contractInterface: this.sorQueriesInterface,
            functionFragment: 'getPoolData',
            values: [poolIds, config],
            options,
        });
    }

    private isStablePoolType(poolType: string): boolean {
        return (
            poolType === 'Stable' ||
            poolType === 'MetaStable' ||
            poolType === 'StablePhantom' ||
            poolType === 'ComposableStable'
        );
    }

    private isLinearPoolType(poolType: string): boolean {
        return poolType.includes('Linear');
    }
}
