import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        testTimeout: 10_000,
        hookTimeout: 20_000,
    },
});
