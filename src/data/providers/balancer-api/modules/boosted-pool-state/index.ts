import { BalancerApiClient } from '../../client';
import { PoolStateWithUnderlyings } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { gql } from 'graphql-tag';
import { DocumentNode, print } from 'graphql';

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

        return {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type:
                data.poolGetPool.protocolVersion === 2
                    ? mapPoolType(data.poolGetPool.type)
                    : data.poolGetPool.type,
        };
    }
}
