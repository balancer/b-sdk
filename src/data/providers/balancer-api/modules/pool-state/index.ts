import {
    PoolState,
    PoolStateWithBalancesAndDynamicData,
} from '../../../../../entities';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';
import { BalancerApiClient } from '../../client';

export class Pools {
    readonly poolStateQuery = `#graphql
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
          symbol
          name
        }
      }
    }`;

    readonly poolStateWithRawTokensQuery = `#graphql
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
          symbol
          name
        }
        dynamicData {
          totalShares
          volume24h
          fees24h
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
            type: mapPoolType(data.poolGetPool.type),
        };
        return poolGetPool;
    }

    async fetchPoolStateWithBalances(
        id: string,
    ): Promise<PoolStateWithBalancesAndDynamicData> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.poolStateWithRawTokensQuery,
            variables: {
                id: id.toLowerCase(),
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });
        const poolStateWithBalances: PoolStateWithBalancesAndDynamicData = {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type: mapPoolType(data.poolGetPool.type),
            totalShares: data.poolGetPool.dynamicData.totalShares,
            volume24h: data.poolGetPool.dynamicData.volume24h,
            fees24h: data.poolGetPool.dynamicData.fees24h,
        };
        return poolStateWithBalances;
    }
}
