// pnpm test -- balancerApi.test.ts
import {
    BalancerApi,
    ChainId,
    NestedPoolState,
    PoolState,
    API_ENDPOINT,
    PoolStateWithUnderlyings,
} from '../../../src';

// Placeholder test to help validate the impact of API updates
// Note: should not be included to CI checks
describe(
    'BalancerApi Provider',
    () => {
        test('CS Pool - Should add BPT to tokens', async () => {
            const chainId = ChainId.MAINNET;
            // wstEth/WETH CS Pool
            const poolId =
                '0x93d199263632a4ef4bb438f1feb99e57b4b5f0bd0000000000000000000005c2';

            // API is used to fetch relevant pool data
            const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
            const poolStateInput: PoolState =
                await balancerApi.pools.fetchPoolState(poolId);

            expect(poolStateInput.tokens.length).toEqual(3);
            expect(poolStateInput.tokens[1].address).toEqual(
                poolStateInput.address,
            );
        });
    },
    {
        timeout: 60000,
    },
);

describe(
    'BalancerApi Provider for boosted pools',
    () => {
        test.only('boosted pool has underlying token data', async () => {
            const chainId = ChainId.MAINNET;
            // wstEth/WETH Boosted Pool
            const poolId = '0xc4ce391d82d164c166df9c8336ddf84206b2f812';

            // API is used to fetch relevant pool data
            const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
            const poolStateInput: PoolStateWithUnderlyings =
                await balancerApi.pools.fetchPoolState(poolId);

            expect(poolStateInput.tokens.length).toEqual(2);
            expect(poolStateInput.tokens).toEqual([
                {
                    index: 0,
                    address: '0x0fe906e030a44ef24ca8c7dc7b7c53a6c4f00ce9',
                    decimals: 18,
                    underlyingToken: {
                        address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                        decimals: 18,
                        index: 0,
                    },
                },
                {
                    index: 1,
                    address: '0x775f661b0bd1739349b9a2a3ef60be277c5d2d29',
                    decimals: 18,
                    underlyingToken: {
                        address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
                        decimals: 18,
                        index: 1,
                    },
                },
            ]);
        });
    },
    {
        timeout: 60000,
    },
);

// Placeholder test to help validate the impact of API updates
// Note: should not be included to CI checks
describe(
    'BalancerApi Provider for nested pools',
    () => {
        test('Nested pool is mapped into a proper NestedPoolState', async () => {
            const chainId = ChainId.MAINNET;
            // WETH-3POOL nested Pool
            const poolId =
                '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0';

            // API is used to fetch relevant pool data
            const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
            const nestedPoolState: NestedPoolState =
                await balancerApi.nestedPools.fetchNestedPoolState(poolId);

            expect(nestedPoolState.mainTokens).toHaveLength(4);
            expect(nestedPoolState.pools).toHaveLength(2);
        });
    },
    {
        timeout: 60000,
    },
);
