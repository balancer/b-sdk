import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
    return {
        test: {
            testTimeout: 20_000,
            hookTimeout: 30_000,
            globalSetup: ['./test/anvil/anvil-global-setup.ts'],
            // Uncomment to debug suite excluding some tests
            exclude: ['test/*weighted*.integration.*', 'node_modules', 'dist'],
            threads: false,
        },
    };
});
