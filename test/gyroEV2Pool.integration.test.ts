// pnpm test -- test/gyroEV2Pool.integration.test.ts
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import testPools from './lib/testData/testPools/gyroE_44215395.json';
import { BATCHSIZE, ChainId, VAULT } from '../src/utils';
import {
    BasePool,
    OnChainPoolDataEnricher,
    RawGyroEPool,
    SmartOrderRouter,
    SwapKind,
    SwapOptions,
    Token,
    sorGetSwapsWithPools,
} from '../src';
import { parseEther } from 'viem';
import { GyroEPool, GyroEPoolToken } from '../src/entities/pools/gyroE';
import { MockPoolProvider } from './lib/utils/mockPoolProvider';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);

describe('gyroEV2: WMATIC-stMATIC integration tests', () => {
    const WMATIC = new Token(
        chainId,
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        18,
        'WMATIC',
    );
    const stMATIC = new Token(
        chainId,
        '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
        18,
        'stMATIC',
    );
    const swapOptions: SwapOptions = {
        block: 44215395n,
    };
    let sor: SmartOrderRouter;

    beforeAll(() => {
        const pools = [{ ...testPools }.pools[2]] as RawGyroEPool[];
        const mockPoolProvider = new MockPoolProvider(pools);
        const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
            chainId,
            rpcUrl,
            BATCHSIZE[chainId],
            VAULT[chainId],
        );

        sor = new SmartOrderRouter({
            chainId,
            poolDataProviders: mockPoolProvider,
            poolDataEnrichers: onChainPoolDataEnricher,
            rpcUrl: rpcUrl,
        });
    });

    let pools: BasePool[];
    beforeEach(async () => {
        pools = await sor.fetchAndCachePools(swapOptions.block);
    });

    describe('ExactIn', () => {
        const swapKind = SwapKind.GivenIn;
        test('should return no swaps when above limit', async () => {
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const swapAmount = parseEther('11206540');
            const swapInfo = await sorGetSwapsWithPools(
                tokenIn,
                tokenOut,
                swapKind,
                swapAmount,
                pools,
                swapOptions,
            );

            expect(swapInfo).toBeNull();
        });
        test('token > LSD, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tIn } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenIn,
                parseEther('1.12345678'),
                tIn.rate,
                tIn.index,
            );
            const swapInfo = await sorGetSwapsWithPools(
                tokenIn,
                tokenOut,
                swapKind,
                swapAmount,
                pools,
                swapOptions,
            );

            const onchain = await swapInfo?.query(rpcUrl, swapOptions.block);
            expect(swapAmount.amount).toEqual(swapInfo?.inputAmount.amount);
            expect(onchain).toEqual(swapInfo?.outputAmount);
        });
        test('LSD > token, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = stMATIC;
            const tokenOut = WMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tIn } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenIn,
                parseEther('0.999'),
                tIn.rate,
                tIn.index,
            );
            const swapInfo = await sorGetSwapsWithPools(
                tokenIn,
                tokenOut,
                swapKind,
                swapAmount,
                pools,
                swapOptions,
            );

            const onchain = await swapInfo?.query(rpcUrl, swapOptions.block);
            expect(swapAmount.amount).toEqual(swapInfo?.inputAmount.amount);
            expect(onchain).toEqual(swapInfo?.outputAmount);
        });
    });

    describe('ExactOut', () => {
        const swapKind = SwapKind.GivenOut;

        test('should return no swaps when above limit', async () => {
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const swapAmount = parseEther('30310600');
            const swapInfo = await sorGetSwapsWithPools(
                tokenIn,
                tokenOut,
                swapKind,
                swapAmount,
                pools,
                swapOptions,
            );

            expect(swapInfo).toBeNull();
        });
        test('token > LSD, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tOut } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenOut,
                parseEther('1.987654321'),
                tOut.rate,
                tOut.index,
            );
            const swapInfo = await sorGetSwapsWithPools(
                tokenIn,
                tokenOut,
                swapKind,
                swapAmount,
                pools,
                swapOptions,
            );

            const onchain = await swapInfo?.query(rpcUrl, swapOptions.block);
            expect(swapAmount.amount).toEqual(swapInfo?.outputAmount.amount);
            expect(onchain).toEqual(swapInfo?.inputAmount);
        });
        test('LSD > token, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = stMATIC;
            const tokenOut = WMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tOut } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenOut,
                parseEther('0.999'),
                tOut.rate,
                tOut.index,
            );
            const swapInfo = await sorGetSwapsWithPools(
                tokenIn,
                tokenOut,
                swapKind,
                swapAmount,
                pools,
                swapOptions,
            );

            const onchain = await swapInfo?.query(rpcUrl, swapOptions.block);
            expect(swapAmount.amount).toEqual(swapInfo?.outputAmount.amount);
            expect(onchain).toEqual(swapInfo?.inputAmount);
        });
    });
});
