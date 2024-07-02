import { BalancerApiClient } from '../../client';
import { PoolState, PoolStateWithBalances } from '../../../../../entities';
import { mapPoolType } from '../../../../../utils/poolTypeMapper';

export class Pools {
    readonly poolStateQuery = `
    query GetPool($id: String!) {
      poolGetPool(id:$id) {
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
    query GetPool($id: String!) {
      poolGetPool(id:$id) {
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
    ): Promise<PoolStateWithBalances> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.poolStateWithRawTokensQuery,
            variables: {
                id: id.toLowerCase(),
            },
        });
        const poolStateWithBalances: PoolStateWithBalances = {
            ...data.poolGetPool,
            tokens: data.poolGetPool.poolTokens,
            type: mapPoolType(data.poolGetPool.type),
            totalShares: data.poolGetPool.dynamicData.totalShares,
        };
        return poolStateWithBalances;
    }
}
