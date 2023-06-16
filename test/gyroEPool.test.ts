// pnpm test -- test/gyroEPool.test.ts

import { formatEther } from 'viem';
import { ChainId, SwapKind, Token, TokenAmount } from '../src';
import { RawGyroEPool } from '../src/data/types';
import { GyroEPool } from '../src/entities/pools/gyroE';
import testPools from './lib/testData/gyroETestPool.json';

describe('gyroEPool tests', () => {
    const testPool = { ...testPools }.pools[0] as RawGyroEPool;
    const chainId = ChainId.GOERLI;
    const pool = GyroEPool.fromRawPool(chainId, testPool);
    const tokenIn = new Token(
        chainId,
        '0x2a7fa61d84db003a999bf4623942f235bff659a8',
        18,
        'MTK',
    );
    const tokenOut = new Token(
        chainId,
        '0x4ac0909d762f20dfee3efc6a5ce1029c78812648',
        18,
        'MTK2',
    );
    describe.skip('normalized liquidity', () => {
        test('should correctly calculate normalized liquidity', async () => {
            const normalizedLiquidity = pool.getNormalizedLiquidity(
                tokenIn,
                tokenOut,
            );

            expect(Number(normalizedLiquidity)).toBeCloseTo(
                8521784.473067058,
                12,
            );
        });
    });

    describe('limit amount swap', () => {
        test('should correctly calculate limit amount for swap exact in', async () => {
            const limitAmount = pool.getLimitAmountSwap(
                tokenIn,
                tokenOut,
                SwapKind.GivenIn,
            );

            expect(Number(formatEther(limitAmount))).toBeCloseTo(
                354.48480273457726733583,
                8,
            );
        });

        test('should correctly calculate limit amount for swap exact out', async () => {
            const limitAmount = pool.getLimitAmountSwap(
                tokenIn,
                tokenOut,
                SwapKind.GivenOut,
            );

            expect(Number(formatEther(limitAmount))).toBeCloseTo(99.9999, 6);
        });
    });

    describe('swap amounts', () => {
        test('should correctly calculate swap amount for swap exact in', async () => {
            const swapAmount = pool.swapGivenIn(
                tokenIn,
                tokenOut,
                TokenAmount.fromHumanAmount(tokenIn, '10'),
            );

            expect(Number(formatEther(swapAmount.amount))).toBeCloseTo(
                2.821007799187925949,
                5,
            );
        });

        test('should correctly calculate swap amount for swap exact out', async () => {
            const swapAmount = pool.swapGivenOut(
                tokenIn,
                tokenOut,
                TokenAmount.fromHumanAmount(tokenOut, '10'),
            );

            const reduced = formatEther(
                pool.subtractSwapFeeAmount(swapAmount).amount,
            );

            expect(Number(reduced)).toBeCloseTo(32.25798733990937, 5);
        });
    });
});
