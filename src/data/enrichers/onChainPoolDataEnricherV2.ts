import {
    Address,
    createPublicClient,
    formatUnits,
    http,
    PublicClient,
} from 'viem';
import {
    GetPoolsResponse,
    PoolDataEnricher,
    RawPool,
    RawPoolTokenWithRate,
    RawWeightedPoolToken,
    HumanAmount,
} from '../types';
import { CHAINS } from '../../utils';
import { SwapOptions } from '../../types';
import { onChainPoolDataCallsV2 } from '../helpers/onChainPoolDataCallsV2';

export interface OnChainPoolDataV2 {
    id: string;
    balances: readonly bigint[];
    totalSupply: bigint;
    swapFee?: bigint;

    amp?: bigint;
    weights?: readonly bigint[];
    wrappedTokenRate?: bigint;
    scalingFactors?: readonly bigint[];
    tokenRates?: readonly bigint[];
    linearTargets?: readonly bigint[];
    poolRate?: bigint;

    isPaused: boolean;
    inRecoveryMode: boolean;
}

export class OnChainPoolDataEnricherV2 implements PoolDataEnricher {
    private readonly client: PublicClient;

    constructor(
        private readonly chainId: number,
        private readonly rpcUrl: string,
        private readonly batchSize: number,
        private readonly vault: Address,
    ) {
        this.client = createPublicClient({
            transport: http(this.rpcUrl, { timeout: 60_000 }),
            chain: CHAINS[this.chainId],
        });
    }

    public async fetchAdditionalPoolData(
        data: GetPoolsResponse,
        options: SwapOptions,
    ): Promise<OnChainPoolDataV2[]> {
        if (data.pools.length === 0) {
            return [];
        }

        const calls = data.pools.flatMap(({ id, poolType, poolTypeVersion }) =>
            onChainPoolDataCallsV2(poolType, poolTypeVersion, this.vault).build(
                id,
                poolType,
                this.vault,
            ),
        );

        const results = await this.client.multicall({
            contracts: calls,
            batchSize: this.batchSize,
            blockNumber: options.block,
        });

        results.forEach((r, i) => {
            if (r.status === 'failure')
                console.error(
                    'Failed request in multicall',
                    calls[i].address,
                    calls[i].functionName,
                    r.error,
                );
        });

        let shift = 0;

        return data.pools.map(({ id, poolType, poolTypeVersion }) => {
            const result = {
                id,
                ...onChainPoolDataCallsV2(
                    poolType,
                    poolTypeVersion,
                    this.vault,
                ).parse(results, shift),
            } as OnChainPoolDataV2;
            shift += onChainPoolDataCallsV2(
                poolType,
                poolTypeVersion,
                this.vault,
            ).count;
            return result;
        });
    }

    public enrichPoolsWithData(
        pools: RawPool[],
        additionalPoolData: OnChainPoolDataV2[],
    ): RawPool[] {
        return pools.map((pool) => {
            const data = additionalPoolData.find((item) => item.id === pool.id);

            return {
                ...pool,
                tokens: pool.tokens
                    .sort((a, b) => a.index - b.index)
                    .map((token) => {
                        return {
                            ...token,
                            balance:
                                data?.balances && data.balances.length > 0
                                    ? (formatUnits(
                                          data.balances[token.index],
                                          token.decimals,
                                      ) as HumanAmount)
                                    : token.balance,
                            priceRate: this.getPoolTokenRate({
                                pool,
                                token: token as RawPoolTokenWithRate,
                                data,
                                index: token.index,
                            }),
                            weight: data?.weights
                                ? formatUnits(data.weights[token.index], 18)
                                : (token as RawWeightedPoolToken).weight,
                        };
                    }),
                totalShares: data?.totalSupply
                    ? (formatUnits(data.totalSupply, 18) as HumanAmount)
                    : pool.totalShares,
                amp: data?.amp
                    ? formatUnits(data.amp, 3)
                    : 'amp' in pool
                      ? pool.amp
                      : undefined,
                swapFee: data?.swapFee
                    ? (formatUnits(data.swapFee, 18) as HumanAmount)
                    : pool.swapFee,
                tokenRates: data?.tokenRates
                    ? data.tokenRates.map(
                          (tokenRate) =>
                              formatUnits(tokenRate, 18) as HumanAmount,
                      )
                    : undefined,
                lowerTarget: data?.linearTargets
                    ? (formatUnits(data.linearTargets[0], 18) as HumanAmount)
                    : 'lowerTarget' in pool
                      ? pool.lowerTarget
                      : undefined,
                upperTarget: data?.linearTargets
                    ? (formatUnits(data.linearTargets[1], 18) as HumanAmount)
                    : 'upperTarget' in pool
                      ? pool.upperTarget
                      : undefined,
                inRecoveryMode: data?.inRecoveryMode || false,
                isPaused: data?.isPaused || false,
            };
        });
    }

    private getPoolTokenRate({
        pool,
        token,
        data,
        index,
    }: {
        pool: RawPool;
        token: RawPoolTokenWithRate;
        data?: OnChainPoolDataV2;
        index: number;
    }): string {
        if (
            data?.wrappedTokenRate &&
            'wrappedIndex' in pool &&
            pool.wrappedIndex === index
        ) {
            return formatUnits(data.wrappedTokenRate, 18);
        }

        if (data?.scalingFactors) {
            const decimalsDiff = 18 - token.decimals;
            return formatUnits(data.scalingFactors[index], 18 + decimalsDiff);
        }

        return token.priceRate;
    }
}
