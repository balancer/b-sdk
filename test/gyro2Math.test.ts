// pnpm test -- gyro2Math.test.ts
import testPools from './lib/testData/testPools/gyro2.json';
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
            const amountInWithFee = pool.addSwapFeeAmount(amountIn).amount;
            expect(amountInWithFee).toEqual(28751245742n);
        });
        test('should correctly reduce by swap fee', async () => {
            const amountInLessFee = pool.subtractSwapFeeAmount(amountIn).amount;
            expect(amountInLessFee).toEqual(28236052169n);
        });
    });

    describe('invariant and virtual parameters', () => {
        test('should correctly calculate invariant', async () => {
            const [a, mb, bSquare, mc] = _calculateQuadraticTerms(
                [tIn.scale18, tOut.scale18],
                sqrtAlpha,
                sqrtBeta,
            );

            expect(a).toEqual(999500474700210n);
            expect(mb).toEqual(2230884220626971757449n);
            expect(bSquare).toEqual(4976844405842411200429555n);
            expect(mc).toEqual(1232000000000000000000000n);

            const L = _calculateQuadratic(a, mb, (mb * mb) / WAD, mc);

            expect(L).toEqual(2232551271501112084098627n);
        });

        test('should correctly calculate virtual parameters', async () => {
            const [a, b] = _findVirtualParams(
                2232551215824107930236259n,
                sqrtAlpha,
                sqrtBeta,
            );

            expect(a).toEqual(2231434660924038777489798n);
            expect(b).toEqual(2231435776865147462654764n);
        });
    });
});
