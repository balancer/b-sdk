import { BalancerApiClient } from '../../client';
import { PoolState, PoolStateWithBalances } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { gql } from 'graphql-tag';
import { DocumentNode, print } from 'graphql';
import { Address } from 'viem';
import {
    poolGetPoolQuery,
    poolGetPoolWithBalancesQuery,
} from '../../generated/types';

export class Pools {
    readonly poolStateQuery: DocumentNode = gql`
    query poolGetPool($id: String!, $chain: GqlChain!) {
      poolGetPool(id: $id, chain: $chain) {
        id
        address
        type
        protocolVersion
        poolTokens {
          index
          address
          decimals
        }
      }
    }`;

    readonly poolStateWithRawTokensQuery: DocumentNode = gql`
    query poolGetPoolWithBalances($id: String!, $chain: GqlChain!) {
      poolGetPool(id: $id, chain: $chain) {
        id
        address
        type
        protocolVersion
        poolTokens {
          index
          address
          decimals
          balance
        }
        dynamicData {
          totalShares
        }
      }
    }`;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    async fetchPoolState(id: string): Promise<PoolState> {
        const { data } = await this.balancerApiClient.fetch({
            query: print(this.poolStateQuery),
            variables: {
                id: id.toLowerCase(),
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });

        // Now data is fully typed as poolGetPoolQuery
        const apiResponse: poolGetPoolQuery = data;
        const poolData = apiResponse.poolGetPool;

        return {
            ...poolData,
            id: poolData.id as `0x${string}`,
            address: poolData.address as Address,
            protocolVersion: poolData.protocolVersion as 1 | 2 | 3,
            tokens: poolData.poolTokens.map((token) => ({
                address: token.address as Address,
                decimals: token.decimals,
                index: token.index,
            })),
            type:
                poolData.protocolVersion === 2
                    ? mapPoolType(poolData.type)
                    : poolData.type,
        };
    }

    async fetchPoolStateWithBalances(
        id: string,
    ): Promise<PoolStateWithBalances> {
        const { data } = await this.balancerApiClient.fetch({
            query: print(this.poolStateWithRawTokensQuery),
            variables: {
                id: id.toLowerCase(),
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });

        // Now data is fully typed as poolGetPoolWithBalancesQuery
        const apiResponse: poolGetPoolWithBalancesQuery = data;
        const poolData = apiResponse.poolGetPool;

        return {
            ...poolData,
            id: poolData.id as `0x${string}`,
            address: poolData.address as Address,
            protocolVersion: poolData.protocolVersion as 1 | 2 | 3,
            tokens: poolData.poolTokens.map((token) => ({
                address: token.address as Address,
                decimals: token.decimals,
                index: token.index,
                balance: token.balance as `${number}`,
            })),
            type:
                poolData.protocolVersion === 2
                    ? mapPoolType(poolData.type)
                    : poolData.type,
            totalShares: poolData.dynamicData.totalShares as `${number}`,
        };
    }
}
