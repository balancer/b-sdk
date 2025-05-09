import { defineConfig } from 'tsup';
import pkg from './package.json';

export default defineConfig({
    entry: ['src/index.ts'],
    bundle: true,
    clean: true,
    dts: true,
    format: ['esm', 'cjs'],
    sourcemap: true,
    splitting: true,
    target: 'es2021',
    define: {
        __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
});
