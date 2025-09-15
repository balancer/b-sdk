import { BalancerApiClient } from '../../client';
import { PoolState, PoolStateWithBalances } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { gql } from 'graphql-tag';
import { DocumentNode, print } from 'graphql';

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

        return {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type:
                data.poolGetPool.protocolVersion === 2
                    ? mapPoolType(data.poolGetPool.type)
                    : data.poolGetPool.type,
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

        return {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type:
                data.poolGetPool.protocolVersion === 2
                    ? mapPoolType(data.poolGetPool.type)
                    : data.poolGetPool.type,
            totalShares: data.poolGetPool.dynamicData.totalShares,
        };
    }
}
