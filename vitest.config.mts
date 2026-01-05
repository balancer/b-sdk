import { loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        define: {
            'process.env.ETHEREUM_RPC_URL': JSON.stringify(
                env.ETHEREUM_RPC_URL,
            ),
            'process.env.POLYGON_RPC_URL': JSON.stringify(env.POLYGON_RPC_URL),
            'process.env.ARBITRUM_RPC_URL': JSON.stringify(
                env.ARBITRUM_RPC_URL,
            ),
            'process.env.FANTOM_RPC_URL': JSON.stringify(env.FANTOM_RPC_URL),
            'process.env.OPTIMISM_RPC_URL': JSON.stringify(
                env.OPTIMISM_RPC_URL,
            ),
            'process.env.SKIP_GLOBAL_SETUP': JSON.stringify(
                env.SKIP_GLOBAL_SETUP,
            ),
        },
        test: {
            testTimeout: 20_000,
            hookTimeout: 120_000,
            setupFiles: ['/test/vitest-setup.ts'],
            globals: true,
            pool: 'forks',
            // Use 1 thread in CI to reduce RPC rate limiting
            // Can be overridden with VITEST_MAX_THREADS env var
            threads: Number(process.env.VITEST_MAX_THREADS) || 1,
            // Uncomment to debug suite excluding some tests
            // exclude: ['test/*weighted*.integration.*', 'node_modules', 'dist'],
        },
        plugins: [tsconfigPaths()],
    };
});
