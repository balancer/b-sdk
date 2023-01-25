import BalancerSorQueriesAbi from '../../abi/BalancerSorQueries.json';
import { LoadPoolsOptions, PoolDataEnricher, RawPool } from '../types';
import { Interface } from '@ethersproject/abi';
import { jsonRpcFetch } from '../../utils/jsonRpcFetch';

interface OnChainPoolData {
    id: string;
    amp?: string[];
    weights?: string[];
    poolTokens: {
        tokens: string[];
        balances: string[];
    };
    totalSupply: string;
    virtualSupply?: string;
    rate?: string;
    wrappedTokenRate?: string;
    actualSupply?: string;
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
        const data = this.sorQueriesInterface.encodeFunctionData('getPoolData', [poolIds, config]);

        console.time('jsonRpcFetch');
        const fetchResponse = await jsonRpcFetch({
            rpcUrl: this.rpcUrl,
            to: this.sorQueriesAddress,
            data,
        });
        console.timeEnd('jsonRpcFetch');

        const result = this.sorQueriesInterface.decodeFunctionResult('getPoolData', fetchResponse);

        return [];
    }

    public enrichPoolsWithData(pools: RawPool[], additionalPoolData: OnChainPoolData[]): RawPool[] {
        /*const enrichedPools: RawPool[] = [];

        // we filter out any pools with missing or malformed data
        for (const pool of pools) {
            const additional = additionalPoolData.find(item => item.id === pool.id);

            if (!additional) {
                enrichedPools.push(pool);
                continue;
            }

            const {
                poolTokens,
                weights,
                totalSupply,
                virtualSupply,
                actualSupply,
                amp,
                rate,
                wrappedTokenRate,
            } = additional;

            if (this.isStablePoolType(pool.poolType)) {
                if (!amp) {
                    console.error(`Stable Pool Missing Amp: ${pool.id}`);
                    continue;
                } else {
                    // Need to scale amp by precision to match expected Subgraph scale
                    // amp is stored with 3 decimals of precision
                    pool.amp = formatFixed(amp[0], 3).split('.')[0];
                }
            }

            if (this.isLinearPoolType(pool.poolType)) {
                const wrappedIndex = pool.wrappedIndex;
                if (wrappedIndex === undefined || wrappedTokenRate === undefined) {
                    console.error(
                        `Linear Pool Missing WrappedIndex or WrappedTokenRate: ${pool.id} ${wrappedIndex} ${rate}`,
                    );
                    continue;
                }

                pool.tokens[wrappedIndex].priceRate = formatFixed(wrappedTokenRate, 18);
            }

            try {
                poolTokens.tokens.forEach((token, i) => {
                    const tokens = pool.tokens;
                    const T = tokens.find(t => t.address.toLowerCase() === token.toLowerCase());

                    if (!T) {
                        throw new Error(`Pool Missing Expected Token: ${pool.id} ${token}`);
                    }

                    T.balance = formatFixed(poolTokens.balances[i], T.decimals);
                    if (weights) {
                        // Only expected for LBPs
                        T.weight = formatFixed(weights[i], 18);
                    }
                });
            } catch {
                continue;
            }

            // Pools with pre minted BPT
            if (this.isLinearPoolType(pool.poolType) || pool.poolType === 'StablePhantom') {
                if (virtualSupply === undefined) {
                    console.error(`Pool with pre-minted BPT missing Virtual Supply: ${pool.id}`);
                    continue;
                }
                pool.totalShares = formatFixed(virtualSupply, 18);
            } else if (pool.poolType === 'ComposableStable') {
                if (actualSupply === undefined) {
                    console.error(`ComposableStable missing Actual Supply: ${pool.id}`);
                    continue;
                }
                pool.totalShares = formatFixed(actualSupply, 18);
            } else {
                pool.totalShares = formatFixed(totalSupply, 18);
            }

            enrichedPools.push(pool);
        }

        return enrichedPools;*/

        return pools;
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
                pool.poolType === 'PhantomStable'
                    ? TotalSupplyType.VIRTUAL_SUPPLY
                    : pool.poolType === 'ComposableStable'
                    ? TotalSupplyType.ACTUAL_SUPPLY
                    : TotalSupplyType.TOTAL_SUPPLY,
            );

            if (this.isLinearPoolType(pool.poolType)) {
                linearPoolIdxs.push(i);
            }

            if (pool.hasActiveWeightUpdate) {
                weightedPoolIdxs.push(i);
            }

            if (pool.hasActiveAmpUpdate) {
                ampPoolIdxs.push(i);
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
