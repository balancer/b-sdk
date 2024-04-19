// pnpm test -- balancerApi.test.ts
import { BalancerApi, ChainId, NestedPoolState, PoolState } from '../../../src';

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
            const balancerApi = new BalancerApi(
                'https://backend-v3-canary.beets-ftm-node.com/graphql',
                chainId,
            );
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
            const balancerApi = new BalancerApi(
                'https://backend-v3-canary.beets-ftm-node.com/graphql',
                chainId,
            );
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
