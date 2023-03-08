import { Address, createPublicClient, formatUnits, Hex, http } from 'viem';
import { sorQueriesAbi } from '../../abi/';
import { GetPoolsResponse, PoolDataEnricher, RawPool, RawPoolTokenWithRate } from '../types';

import {
    poolHasActualSupply,
    poolHasPercentFee,
    poolHasVirtualSupply,
    poolIsLinearPool,
} from '../../utils';
import { HumanAmount, SwapOptions } from '../../types';

interface OnChainPoolData {
    id: string;
    balances: readonly bigint[];
    totalSupply: bigint;
    swapFee?: bigint;

    amp?: bigint;
    weights?: readonly bigint[];
    wrappedTokenRate?: bigint;
    scalingFactors?: readonly bigint[];
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
    blockNumber: bigint;
    loadTotalSupply: boolean;
    loadSwapFees: boolean;
    loadLinearWrappedTokenRates: boolean;
    loadWeightsForPools: {
        poolIds?: string[];
        poolTypes?: string[];
    };
    loadAmpForPools: {
        poolIds?: string[];
        poolTypes?: string[];
    };
    loadScalingFactorForPools: {
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
    blockNumber: bigint;
    totalSupplyTypes: TotalSupplyType[];
    swapFeeTypes: SwapFeeType[];
    linearPoolIdxs: bigint[];
    weightedPoolIdxs: bigint[];
    scalingFactorPoolIdxs: bigint[];
    ampPoolIdxs: bigint[];
}

export class OnChainPoolDataEnricher implements PoolDataEnricher {
    private readonly config: OnChainPoolDataQueryConfig;

    constructor(
        private readonly rpcUrl: string,
        private readonly sorQueriesAddress: Address,
        config?: Partial<OnChainPoolDataQueryConfig>,
    ) {
        this.config = {
            loadTokenBalanceUpdatesAfterBlock: true,
            blockNumber: 0n,
            loadTotalSupply: true,
            loadLinearWrappedTokenRates: true,
            loadSwapFees: true,
            loadAmpForPools: {},
            loadScalingFactorForPools: {},
            loadWeightsForPools: {},
            ...config,
        };
    }

    public async fetchAdditionalPoolData(
        data: GetPoolsResponse,
        options: SwapOptions,
    ): Promise<OnChainPoolData[]> {
        const rawPools = data.pools;

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
        } = this.getPoolDataQueryParams(data);

        const client = createPublicClient({
            transport: http(this.rpcUrl),
        });

        const [
            balances,
            amps,
            linearWrappedTokenRates,
            totalSupplies,
            weights,
            scalingFactors,
            swapFees,
        ] = await client.readContract({
            address: this.sorQueriesAddress,
            abi: sorQueriesAbi,
            functionName: 'getPoolData',
            args: [
                poolIds,
                {
                    loadTokenBalanceUpdatesAfterBlock:
                        this.config.loadTokenBalanceUpdatesAfterBlock,
                    loadTotalSupply: this.config.loadTotalSupply,
                    loadSwapFees: this.config.loadSwapFees,
                    loadLinearWrappedTokenRates: this.config.loadLinearWrappedTokenRates,
                    loadNormalizedWeights: weightedPoolIdxs.length > 0,
                    loadScalingFactors: scalingFactorPoolIdxs.length > 0,
                    loadAmps: ampPoolIdxs.length > 0,
                    blockNumber: data.syncedToBlockNumber || 0n,
                    totalSupplyTypes,
                    swapFeeTypes,
                    linearPoolIdxs,
                    weightedPoolIdxs,
                    scalingFactorPoolIdxs,
                    ampPoolIdxs,
                },
            ],
            blockNumber: options.block,
        });

        return poolIds.map((poolId, i) => ({
            id: poolIds[i],
            balances: balances[i],
            totalSupply: totalSupplies[i],
            weights: weightedPoolIdxs.includes(BigInt(i))
                ? weights[weightedPoolIdxs.indexOf(BigInt(i))]
                : undefined,
            amp: ampPoolIdxs.includes(BigInt(i)) ? amps[ampPoolIdxs.indexOf(BigInt(i))] : undefined,
            wrappedTokenRate: linearPoolIdxs.includes(BigInt(i))
                ? linearWrappedTokenRates[linearPoolIdxs.indexOf(BigInt(i))]
                : undefined,
            scalingFactors: scalingFactors[i],
            swapFee: swapFees[i],
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
                            ? formatUnits(data.balances[idx], token.decimals)
                            : token.balance,
                    priceRate: this.getPoolTokenRate({ pool, token, data, index: idx }),
                    weight: data?.weights ? formatUnits(data.weights[idx], 18) : token.weight,
                })),
                totalShares: data?.totalSupply
                    ? (formatUnits(data.totalSupply, 18) as HumanAmount)
                    : pool.totalShares,
                amp: data?.amp
                    ? formatUnits(data.amp, 3).split('.')[0]
                    : 'amp' in pool
                    ? pool.amp
                    : undefined,
                swapFee: data?.swapFee
                    ? (formatUnits(data.swapFee, 18) as HumanAmount)
                    : pool.swapFee,
            };
        });
    }

    private getPoolDataQueryParams(data: GetPoolsResponse) {
        const poolIds: Hex[] = [];
        const totalSupplyTypes: TotalSupplyType[] = [];
        const linearPoolIdxs: bigint[] = [];
        const weightedPoolIdxs: bigint[] = [];
        const ampPoolIdxs: bigint[] = [];
        const scalingFactorPoolIdxs: bigint[] = [];
        const swapFeeTypes: SwapFeeType[] = [];

        const {
            loadScalingFactorForPoolTypes,
            loadScalingFactorForPoolIds,
            loadWeightsForPoolTypes,
            loadAmpForPoolTypes,
            loadAmpForPoolIds,
            loadWeightsForPoolIds,
        } = this.getMergedFilterConfig(data);

        for (let i = 0; i < data.pools.length; i++) {
            const pool = data.pools[i];

            poolIds.push(pool.id);

            totalSupplyTypes.push(
                poolHasVirtualSupply(pool.poolType)
                    ? TotalSupplyType.VIRTUAL_SUPPLY
                    : poolHasActualSupply(pool.poolType)
                    ? TotalSupplyType.ACTUAL_SUPPLY
                    : TotalSupplyType.TOTAL_SUPPLY,
            );

            if (poolIsLinearPool(pool.poolType)) {
                linearPoolIdxs.push(BigInt(i));
            }

            if (loadWeightsForPoolTypes.has(pool.poolType) || loadWeightsForPoolIds.has(pool.id)) {
                weightedPoolIdxs.push(BigInt(i));
            }

            if (loadAmpForPoolTypes.has(pool.poolType) || loadAmpForPoolIds.has(pool.id)) {
                ampPoolIdxs.push(BigInt(i));
            }

            if (
                loadScalingFactorForPoolIds.has(pool.id) ||
                loadScalingFactorForPoolTypes.has(pool.poolType)
            ) {
                scalingFactorPoolIdxs.push(BigInt(i));
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

    private getMergedFilterConfig({
        poolsWithActiveWeightUpdates = [],
        poolsWithActiveAmpUpdates = [],
    }: {
        poolsWithActiveWeightUpdates?: string[];
        poolsWithActiveAmpUpdates?: string[];
    }) {
        const { loadWeightsForPools, loadScalingFactorForPools, loadAmpForPools } = this.config;

        const loadWeightsForPoolIds = new Set([
            ...poolsWithActiveWeightUpdates,
            ...(loadWeightsForPools.poolIds || []),
        ]);
        const loadAmpForPoolIds = new Set([
            ...poolsWithActiveAmpUpdates,
            ...(loadAmpForPools.poolIds || []),
        ]);
        const loadScalingFactorForPoolIds = new Set(loadScalingFactorForPools.poolIds || []);
        const loadWeightsForPoolTypes = new Set(loadWeightsForPools.poolTypes || []);
        const loadAmpForPoolTypes = new Set(loadAmpForPools.poolTypes || []);
        const loadScalingFactorForPoolTypes = new Set(loadScalingFactorForPools.poolTypes || []);

        return {
            loadWeightsForPoolIds,
            loadAmpForPoolIds,
            loadScalingFactorForPoolIds,
            loadWeightsForPoolTypes,
            loadAmpForPoolTypes,
            loadScalingFactorForPoolTypes,
        };
    }

    private getPoolTokenRate({
        pool,
        token,
        data,
        index,
    }: {
        pool: RawPool;
        token: RawPoolTokenWithRate;
        data?: OnChainPoolData;
        index: number;
    }): string {
        if (data?.wrappedTokenRate && 'wrappedIndex' in pool && pool.wrappedIndex === index) {
            return formatUnits(data.wrappedTokenRate, 18);
        }

        if (data?.scalingFactors) {
            return formatUnits(data.scalingFactors[index], 18);
        }

        return token.priceRate;
    }
}
