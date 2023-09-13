import { createPublicClient, formatUnits, http, PublicClient } from 'viem';
import {
    GetPoolsResponse,
    PoolDataEnricher,
    RawPool,
    RawPoolTokenWithRate,
    RawWeightedPoolToken,
} from '../types';

import { CHAINS } from '../../utils';
import { HumanAmount } from '../../types';
import { fetchAdditionalPoolData } from '../onChainPoolDataViaMulticall';
import { OnChainPoolData } from './onChainPoolDataEnricher';

export class OnChainPoolDataViaMulticallEnricher implements PoolDataEnricher {
    private readonly client: PublicClient;

    constructor(
        private readonly chainId: number,
        private readonly rpcUrl: string,
    ) {
        this.client = createPublicClient({
            transport: http(this.rpcUrl),
            chain: CHAINS[this.chainId],
        });
    }

    public async fetchAdditionalPoolData(
        data: GetPoolsResponse,
    ): Promise<OnChainPoolData[]> {
        return fetchAdditionalPoolData(data.pools, this.client);
    }

    public enrichPoolsWithData(
        pools: RawPool[],
        additionalPoolData: OnChainPoolData[],
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
                    ? data.linearTargets[0]
                    : 'lowerTarget' in pool
                    ? pool.lowerTarget
                    : undefined,
                upperTarget: data?.linearTargets
                    ? data.linearTargets[0]
                    : 'upperTarget' in pool
                    ? pool.upperTarget
                    : undefined,
                inRecoveryMode: data?.inRecoveryMode || false,
                isPaused: data?.isPaused || false,
                queryFailed: data?.queryFailed,
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
        data?: OnChainPoolData;
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
            return formatUnits(data.scalingFactors[index], 18);
        }

        return token.priceRate;
    }
}
