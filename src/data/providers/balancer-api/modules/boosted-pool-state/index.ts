import { BalancerApiClient } from '../../client';
import { PoolStateWithUnderlyings } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';

import { API_CHAIN_NAMES } from '../../../../../utils/constants';

export class BoostedPools {
    readonly boostedPoolStateQuery = `
    query poolGetPool($id: String!, $chain: GqlChain!) {
      poolGetPool(id: $id, chain:$chain) {
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
            query: this.boostedPoolStateQuery,
            variables: {
                id: id.toLowerCase(),
                // the API requires chain names to be sent as uppercase strings
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });
        const poolGetPool: PoolStateWithUnderlyings = {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type:
                data.poolGetPool.protocolVersion === 2
                    ? mapPoolType(data.poolGetPool.type)
                    : data.poolGetPool.type,
        };
        return poolGetPool;
    }
}
