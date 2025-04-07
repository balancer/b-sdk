import { BalancerApiClient } from '../../client';
import { PoolState, PoolStateWithBalances } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';

import { API_CHAIN_NAMES } from '../../../../../utils/constants';

export class Pools {
    readonly poolStateQuery = `
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
        }
      }
    }`;

    readonly poolStateWithRawTokensQuery = `
    query GetPool($id: String!, $chain: GqlChain!) {
      poolGetPool(id:$id, chain:$chain) {
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
            query: this.poolStateQuery,
            variables: {
                id: id.toLowerCase(),
                // the API requires chain names to be sent as uppercase strings
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });
        const poolGetPool: PoolState = {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type:
                data.poolGetPool.protocolVersion === 2
                    ? mapPoolType(data.poolGetPool.type)
                    : data.poolGetPool.type,
        };
        return poolGetPool;
    }

    async fetchPoolStateWithBalances(
        id: string,
    ): Promise<PoolStateWithBalances> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.poolStateWithRawTokensQuery,
            variables: {
                id: id.toLowerCase(),
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });
        const poolStateWithBalances: PoolStateWithBalances = {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type:
                data.poolGetPool.protocolVersion === 2
                    ? mapPoolType(data.poolGetPool.type)
                    : data.poolGetPool.type,
            totalShares: data.poolGetPool.dynamicData.totalShares,
        };
        return poolStateWithBalances;
    }
}
