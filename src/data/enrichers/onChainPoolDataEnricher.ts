import BalancerSorQueriesAbi from '../../abi/BalancerSorQueries.json';
import { PoolDataEnricher, RawPool, RawLinearPool, RawBaseStablePool } from '../types';
import { Interface } from '@ethersproject/abi';
import { jsonRpcFetch } from '../../utils/jsonRpcFetch';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import {
    poolHasActualSupply,
    poolHasPercentFee,
    poolHasVirtualSupply,
    poolIsLinearPool,
} from '../../utils';
import { SwapOptions } from '../../types';

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

interface OnChainPoolDataQueryConfig {
    loadTokenBalanceUpdatesAfterBlock: boolean;
    blockNumber: number;
    loadTotalSupply: boolean;
    loadSwapFees: boolean;
    loadLinearWrappedTokenRates: boolean;
    loadScalingFactors: boolean;
    loadWeightsForPools: {
        poolIds?: string[];
        poolTypes?: string[];
    };
    loadAmpForPools: {
        poolIds?: string[];
        poolTypes?: string[];
    };
    loadScalingFactorsForPools: {
        poolIds?: string[];
        poolTypes?: string[];
    };
}

interface SorPoolDataQueryConfig {
    loadTokenBalanceUpdatesAfterBlock: boolean;
    loadTotalSupply: boolean;
    loadSwapFees: boolean;
    loadLinearWrappedTokenRates: boolean;
    loadNormalizedWeights: boolean;
    loadScalingFactors: boolean;
    loadAmps: boolean;
    blockNumber: number;
    totalSupplyTypes: TotalSupplyType[];
    swapFeeTypes: SwapFeeType[];
    linearPoolIdxs: number[];
    weightedPoolIdxs: number[];
    scalingFactorPoolIdxs: number[];
    ampPoolIdxs: number[];
}

export class OnChainPoolDataEnricher implements PoolDataEnricher {
    private readonly sorQueriesInterface: Interface;
    private readonly config: OnChainPoolDataQueryConfig;

    constructor(
        private readonly rpcUrl: string,
        private readonly sorQueriesAddress: string,
        config?: Partial<OnChainPoolDataQueryConfig>,
    ) {
        this.sorQueriesInterface = new Interface(BalancerSorQueriesAbi);

        this.config = {
            loadTokenBalanceUpdatesAfterBlock: true,
            blockNumber: 0,
            loadTotalSupply: true,
            loadLinearWrappedTokenRates: true,
            loadSwapFees: false,
            loadScalingFactors: false,
            loadWeightsForPools: {},
            loadAmpForPools: {},
            loadScalingFactorsForPools: {},
            ...config,
        };
    }

    public async fetchAdditionalPoolData(
        rawPools: RawPool[],
        options: SwapOptions,
        syncedToBlockNumber?: number,
    ): Promise<OnChainPoolData[]> {
        if (rawPools.length === 0) {
            return [];
        }

        const {
            poolIds,
            weightedPoolIdxs,
            ampPoolIdxs,
            linearPoolIdxs,
            totalSupplyTypes,
            scalingFactorPoolIdxs,
            swapFeeTypes,
        } = this.getPoolDataQueryParams(rawPools);

        console.time('jsonRpcFetch');
        const { balances, amps, linearWrappedTokenRates, totalSupplies, weights } =
            await this.fetchOnChainPoolData({
                poolIds,
                config: {
                    loadTokenBalanceUpdatesAfterBlock:
                        this.config.loadTokenBalanceUpdatesAfterBlock,
                    loadTotalSupply: this.config.loadTotalSupply,
                    loadSwapFees: this.config.loadSwapFees,
                    loadLinearWrappedTokenRates: this.config.loadLinearWrappedTokenRates,
                    loadNormalizedWeights: weightedPoolIdxs.length > 0,
                    loadScalingFactors: scalingFactorPoolIdxs.length > 0,
                    loadAmps: ampPoolIdxs.length > 0,

                    blockNumber: syncedToBlockNumber || 0,
                    totalSupplyTypes,
                    swapFeeTypes,
                    linearPoolIdxs,
                    weightedPoolIdxs,
                    scalingFactorPoolIdxs,
                    ampPoolIdxs,
                },
                options,
            });
        console.timeEnd('jsonRpcFetch');

        return poolIds.map((poolId, i) => ({
            id: poolIds[i],
            balances: balances[i],
            totalSupply: totalSupplies[i],
            weights: weightedPoolIdxs.includes(i)
                ? weights[weightedPoolIdxs.indexOf(i)]
                : undefined,
            amp: ampPoolIdxs.includes(i) ? amps[ampPoolIdxs.indexOf(i)] : undefined,
            wrappedTokenRate: linearPoolIdxs.includes(i)
                ? linearWrappedTokenRates[linearPoolIdxs.indexOf(i)]
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
                        data?.wrappedTokenRate &&
                        'wrappedIndex' in pool &&
                        pool.wrappedIndex === idx
                            ? formatFixed(data.wrappedTokenRate, 18)
                            : token.priceRate,
                    weight: data?.weights ? formatFixed(data.weights[idx], 18) : token.weight,
                })),
                totalShares: data?.totalSupply
                    ? formatFixed(data.totalSupply, 18)
                    : pool.totalShares,
                amp: data?.amp
                    ? formatFixed(data.amp, 3).split('.')[0]
                    : 'amp' in pool
                    ? pool.amp
                    : undefined,
            };
        });
    }

    private getPoolDataQueryParams(rawPools: RawPool[]) {
        const poolIdsToLoadWeightsFor = this.config.loadWeightsForPools.poolIds || [];
        const poolTypesToLoadWeightsFor = this.config.loadWeightsForPools.poolTypes || [];
        const poolIdsToLoadAmpFor = this.config.loadAmpForPools.poolIds || [];
        const poolTypesToLoadAmpFor = this.config.loadAmpForPools.poolTypes || [];
        const poolIdsToLoadScalingFactorsFor = this.config.loadScalingFactorsForPools.poolIds || [];
        const poolTypesToLoadScalingFactorsFor =
            this.config.loadScalingFactorsForPools.poolTypes || [];

        const poolIds: string[] = [];
        const totalSupplyTypes: TotalSupplyType[] = [];
        const linearPoolIdxs: number[] = [];
        const weightedPoolIdxs: number[] = [];
        const ampPoolIdxs: number[] = [];
        const scalingFactorPoolIdxs: number[] = [];
        const swapFeeTypes: SwapFeeType[] = [];

        for (let i = 0; i < rawPools.length; i++) {
            const pool = rawPools[i];

            poolIds.push(pool.id);

            totalSupplyTypes.push(
                poolHasVirtualSupply(pool.poolType)
                    ? TotalSupplyType.VIRTUAL_SUPPLY
                    : poolHasActualSupply(pool.poolType)
                    ? TotalSupplyType.ACTUAL_SUPPLY
                    : TotalSupplyType.TOTAL_SUPPLY,
            );

            if (poolIsLinearPool(pool.poolType)) {
                linearPoolIdxs.push(i);
            }

            if (
                poolIdsToLoadWeightsFor.includes(pool.id) ||
                poolTypesToLoadWeightsFor.includes(pool.poolType)
            ) {
                weightedPoolIdxs.push(i);
            }

            if (
                poolIdsToLoadAmpFor.includes(pool.id) ||
                poolTypesToLoadAmpFor.includes(pool.poolType)
            ) {
                ampPoolIdxs.push(i);
            }

            if (
                poolIdsToLoadScalingFactorsFor.includes(pool.id) ||
                poolTypesToLoadScalingFactorsFor.includes(pool.poolType)
            ) {
                scalingFactorPoolIdxs.push(i);
            }

            if (this.config.loadSwapFees) {
                swapFeeTypes.push(
                    poolHasPercentFee(pool.poolType)
                        ? SwapFeeType.PERCENT_FEE
                        : SwapFeeType.SWAP_FEE_PERCENTAGE,
                );
            }
        }

        return {
            poolIds,
            totalSupplyTypes,
            linearPoolIdxs,
            weightedPoolIdxs,
            ampPoolIdxs,
            scalingFactorPoolIdxs,
            swapFeeTypes,
        };
    }

    private async fetchOnChainPoolData({
        poolIds,
        config,
        options,
    }: {
        poolIds: string[];
        config: SorPoolDataQueryConfig;
        options?: SwapOptions;
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
}
