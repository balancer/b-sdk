import { BalancerApiClient } from '../../client';
import { NestedPool, NestedPoolState } from '../../../../../entities';
import { MinimalToken } from '../../../../types';
import { Address, Hex } from '../../../../../types';
import { mapPoolType } from '@/utils/poolTypeMapper';
import { isSameAddress } from '@/utils';

export type PoolGetPool = {
    id: Hex;
    address: Address;
    type: string;
    allTokens: {
        address: Address;
        decimals: number;
        isMainToken: boolean;
    }[];
    poolTokens: {
        index: number;
        address: Address;
        decimals: number;
        nestedPool: {
            id: Hex;
            address: Address;
            type: string;
            tokens: {
                index: number;
                address: Address;
                decimals: number;
            }[];
        };
    }[];
};

export class NestedPools {
    readonly nestedPoolStateQuery = `
    query GetPool($id: String!) {
      poolGetPool(id:$id) {
        id
        address
        type
        allTokens {
          address
          decimals
          isMainToken
        }
        poolTokens {
          index
          address
          decimals
          nestedPool {
            id
            address
            type
            tokens {
              index
              address
              decimals
            }
          }
        }
      }
    }
`;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    fetchNestedPoolState = async (id: string): Promise<NestedPoolState> => {
        const {
            data: { poolGetPool },
        } = await this.balancerApiClient.fetch({
            query: this.nestedPoolStateQuery,
            variables: {
                id,
            },
        });

        const nestedPoolState = this.mapPoolToNestedPoolState(
            poolGetPool as PoolGetPool,
        );

        return nestedPoolState;
    };

    mapPoolToNestedPoolState = (pool: PoolGetPool): NestedPoolState => {
        return mapPoolToNestedPoolState(pool);
    };
}

export function mapPoolToNestedPoolState(pool: PoolGetPool): NestedPoolState {
    const pools: NestedPool[] = [
        {
            id: pool.id,
            address: pool.address,
            type: mapPoolType(pool.type),
            level: 1,
            tokens: pool.poolTokens.map((t) => {
                const minimalToken: MinimalToken = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                };
                return minimalToken;
            }),
        },
    ];

    pool.poolTokens.forEach((token) => {
        // Token represents nested pools only if they have a nestedPool property
        // Filter out phantomBpt
        if (
            !token.nestedPool ||
            isSameAddress(pool.address, token.nestedPool.address)
        )
            return;

        // map API result to NestedPool
        pools.push({
            id: token.nestedPool.id,
            address: token.nestedPool.address,
            level: 0,
            type: mapPoolType(token.nestedPool.type),
            tokens: token.nestedPool.tokens.map((t) => {
                const minimalToken: MinimalToken = {
                    address: t.address,
                    decimals: t.decimals,
                    index: t.index,
                };
                return minimalToken;
            }),
        });
    });

    const mainTokens = pool.allTokens
        .filter((t) => t.isMainToken)
        .map((t) => {
            return {
                address: t.address,
                decimals: t.decimals,
            };
        });

    return {
        pools,
        mainTokens,
    } as NestedPoolState;
}
