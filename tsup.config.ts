import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    bundle: true,
    clean: true,
    dts: true,
    format: ['esm'], // The desired output format(s)
    sourcemap: process.env.NODE_ENV !== 'development', // Whether to generate sourcemaps
    splitting: true,
    outDir: 'dist',
    skipNodeModulesBundle: true,
    minify: process.env.NODE_ENV !== 'development', // Whether to minify the output
    // splitting: true, // Whether to split the bundle into chunks
    // target: "node18", // Specify your target environment
});
