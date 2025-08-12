// pnpm test balancerApi.test.ts
import {
    BalancerApi,
    ChainId,
    NestedPoolState,
    PoolState,
    API_ENDPOINT,
} from '../../../src';

// Placeholder test to help validate the impact of API updates
// Note: should not be included to CI checks
describe('BalancerApi Provider', () => {
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

    test('HyperEvm - Should fetch pool state', async () => {
        const chainId = ChainId.HYPEREVM;
        // wstEth/WETH CS Pool
        const poolId = '0x8207c7541ce31b38dbd46890f2a832cf1ef7c512';

        // API is used to fetch relevant pool data
        const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
        const poolStateInput: PoolState =
            await balancerApi.pools.fetchPoolState(poolId);

        expect(poolStateInput.tokens.length).toEqual(2);
    });

    test('Should support configuring client name and version', async () => {
        const chainId = ChainId.MAINNET;

        // Custom client options
        const options = {
            clientName: 'test-client',
            clientVersion: '1.2.3',
        };

        // API with custom client options
        const balancerApi = new BalancerApi(API_ENDPOINT, chainId, options);

        // Verify client properties
        expect(balancerApi.balancerApiClient.clientName).toEqual(
            options.clientName,
        );
        expect(balancerApi.balancerApiClient.clientVersion).toEqual(
            options.clientVersion,
        );
    });

    test('Should use default client name and version when not specified', async () => {
        const chainId = ChainId.MAINNET;

        // API without custom client options
        const balancerApi = new BalancerApi(API_ENDPOINT, chainId);

        // Verify default client properties
        expect(balancerApi.balancerApiClient.clientName).toEqual(
            'balancer-sdk',
        );
        // The version should match the package version
        expect(typeof balancerApi.balancerApiClient.clientVersion).toEqual(
            'string',
        );
        expect(
            balancerApi.balancerApiClient.clientVersion.length,
        ).toBeGreaterThan(0);
        // Version should be either package version or fallback in tests
        // Check for semver format (x.y.z)
        expect(balancerApi.balancerApiClient.clientVersion).toMatch(
            /^\d+\.\d+\.\d+$/,
        );
    });

    test('Should prioritize explicit options over environment variables', async () => {
        const chainId = ChainId.MAINNET;

        // Save original environment variables
        const originalName = process.env.BALANCER_SDK_CLIENT_NAME;
        const originalVersion = process.env.BALANCER_SDK_CLIENT_VERSION;

        try {
            // Set environment variables
            process.env.BALANCER_SDK_CLIENT_NAME = 'env-client';
            process.env.BALANCER_SDK_CLIENT_VERSION = '9.9.9';

            // API with custom client options that should override env vars
            const options = {
                clientName: 'explicit-client',
                clientVersion: '5.5.5',
            };
            const balancerApi = new BalancerApi(API_ENDPOINT, chainId, options);

            // Verify explicit options are used
            expect(balancerApi.balancerApiClient.clientName).toEqual(
                options.clientName,
            );
            expect(balancerApi.balancerApiClient.clientVersion).toEqual(
                options.clientVersion,
            );
        } finally {
            // Restore original environment variables
            process.env.BALANCER_SDK_CLIENT_NAME = originalName;
            process.env.BALANCER_SDK_CLIENT_VERSION = originalVersion;
        }
    });
}, 60000);

// Placeholder test to help validate the impact of API updates
// Note: should not be included to CI checks
describe('BalancerApi Provider for nested pools', () => {
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
}, 60000);
