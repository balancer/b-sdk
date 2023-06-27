// pnpm test -- test/gyroEV2Pool.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import testPools from './lib/testData/gyroETestPool.json';
import { expectToBeCloseToDelta } from './lib/utils/helpers';
import { ChainId } from '../src/utils';
import { RawGyroEPool } from '../src/data/types';
import {
    BasePool,
    SwapKind,
    SwapOptions,
    Token,
    sorGetSwapsWithPools,
    sorParseRawPools,
} from '../src';
import { parseEther } from 'viem';
import { GyroEPool, GyroEPoolToken } from '../src/entities/pools/gyroE';

describe('gyroEV2: WMATIC-stMATIC integration tests', () => {
    const chainId = ChainId.POLYGON;
    const rpcUrl = process.env['POLYGON_RPC_URL'] || '';
    const rawPool = { ...testPools }.pools[2] as RawGyroEPool;
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
        block: 42173266n,
    };

    let pools: BasePool[];
    beforeEach(() => {
        pools = sorParseRawPools(chainId, [rawPool]);
    });

    describe('ExactIn', () => {
        const swapKind = SwapKind.GivenIn;
        test('should return no swaps when above limit', async () => {
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const swapAmount = parseEther('33.33333333333333');
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
            const gyroPool = GyroEPool.fromRawPool(chainId, rawPool);
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
            const gyroPool = GyroEPool.fromRawPool(chainId, rawPool);
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
            const gyroPool = GyroEPool.fromRawPool(chainId, rawPool);
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
            const gyroPool = GyroEPool.fromRawPool(chainId, rawPool);
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
            expectToBeCloseToDelta(
                onchain?.amount as bigint,
                swapInfo?.inputAmount.amount as bigint,
                1,
            );
        });
    });
});
