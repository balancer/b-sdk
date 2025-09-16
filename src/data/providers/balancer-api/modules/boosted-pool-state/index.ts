import { BalancerApiClient } from '../../client';
import { PoolStateWithUnderlyings } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { gql } from 'graphql-tag';
import { DocumentNode, print } from 'graphql';
import { Address } from 'viem';
import { poolGetPoolWithUnderlyingsQuery } from '../../generated/types';

export class BoostedPools {
    readonly boostedPoolStateQuery: DocumentNode = gql`
    query poolGetPoolWithUnderlyings($id: String!, $chain: GqlChain!) {
      poolGetPool(id: $id, chain: $chain) {
        id
        address
        type
        protocolVersion
        poolTokens {
          index
          address
          decimals
          underlyingToken {
            address
            decimals
          }
        }
      }
    }`;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    async fetchPoolStateWithUnderlyings(
        id: string,
    ): Promise<PoolStateWithUnderlyings> {
        const { data } = await this.balancerApiClient.fetch({
            query: print(this.boostedPoolStateQuery),
            variables: {
                id: id.toLowerCase(),
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });

        // Now data is fully typed as poolGetPoolWithUnderlyingsQuery
        const apiResponse: poolGetPoolWithUnderlyingsQuery = data;
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
                underlyingToken: token.underlyingToken
                    ? {
                          address: token.underlyingToken.address as Address,
                          decimals: token.underlyingToken.decimals,
                          index: token.index,
                      }
                    : null,
            })),
            type:
                poolData.protocolVersion === 2
                    ? mapPoolType(poolData.type)
                    : poolData.type,
        };
    }
}
