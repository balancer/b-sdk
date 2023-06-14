// pnpm test -- gyro2Math.test.ts
import { formatEther, formatUnits, parseEther } from 'viem';

import testPools from './lib/testData/gyro2TestPool.json';
import { ChainId, RawGyro2Pool, Token, TokenAmount, WAD } from '../src';
import {
    _calculateQuadratic,
    _calculateQuadraticTerms,
    _findVirtualParams,
} from '../src/entities/pools/gyro2/gyro2Math';
import { Gyro2Pool } from '../src/entities/pools/gyro2/gyro2Pool';

describe('gyro2Math tests', () => {
    const testPool = { ...testPools }.pools[0] as RawGyro2Pool;
    const chainId = ChainId.MAINNET;
    const pool = Gyro2Pool.fromRawPool(chainId, testPool);
    const tokenIn = new Token(
        chainId,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        6,
        'USDC',
    );
    const tokenOut = new Token(
        chainId,
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        18,
        'DAI',
    );
    const { tIn, tOut, sqrtAlpha, sqrtBeta } = pool.getPoolPairData(
        tokenIn,
        tokenOut,
    );

    describe('add and remove swap fee', () => {
        const amountIn = TokenAmount.fromHumanAmount(tokenIn, '28492.48453');
        test('should correctly add swap fee', async () => {
            expect(
                Number(
                    formatUnits(
                        pool.subtractSwapFeeAmount(amountIn).amount,
                        tokenIn.decimals,
                    ),
                ),
            ).toBeCloseTo(28751.24575, 0.00001);
        });
        test('should correctly reduce by swap fee', async () => {
            expect(
                Number(
                    formatUnits(
                        pool.subtractSwapFeeAmount(amountIn).amount,
                        tokenIn.decimals,
                    ),
                ),
            ).toBeCloseTo(28236.05217, 0.00001);
        });
    });

    describe('invariant and virtual parameters', () => {
        test('should correctly calculate invariant', async () => {
            const [a, mb, bSquare, mc] = _calculateQuadraticTerms(
                [tIn.scale18, tOut.scale18],
                sqrtAlpha,
                sqrtBeta,
            );

            expect(formatEther(a)).toEqual('0.00099950047470021');
            expect(formatEther(mb)).toEqual('2230.884220626971757449');
            expect(formatEther(bSquare)).toEqual('4976844.405842411200429555');
            expect(formatEther(mc)).toEqual('1232000');

            const L = _calculateQuadratic(a, mb, (mb * mb) / WAD, mc);

            expect(formatEther(L)).toEqual('2232551.271501112084098627');
        });

        test('should correctly calculate virtual parameters', async () => {
            const [a, b] = _findVirtualParams(
                parseEther('2232551.215824107930236259'),
                sqrtAlpha,
                sqrtBeta,
            );

            expect(formatEther(a)).toEqual('2231434.660924038777489798');
            expect(formatEther(b)).toEqual('2231435.776865147462654764');
        });
    });
});
