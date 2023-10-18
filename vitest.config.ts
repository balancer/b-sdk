import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
    return {
        test: {
            testTimeout: 10_000,
            hookTimeout: 20_000,
            globalSetup: ['./test/anvil/anvil-global-setup.ts'],
        },
    };
});
