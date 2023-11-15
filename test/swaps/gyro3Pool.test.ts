// pnpm test -- gyro3Pool.test.ts
import testPools from '../lib/testData/testPools/gyro3_44133130.json';
import { ChainId, RawGyro3Pool, SwapKind, Token, TokenAmount } from '../../src';
import { Gyro3Pool } from '../../src/entities/pools/gyro3';

describe('Gyro3Pool tests USDC > DAI', () => {
    const testPool = { ...testPools }.pools[0] as RawGyro3Pool;
    const chainId = ChainId.GOERLI;
    const pool = Gyro3Pool.fromRawPool(chainId, testPool);

    const USDT = new Token(
        chainId,
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        18,
    );
    const USDC = new Token(
        chainId,
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        6,
    );

    describe('limit amounts', () => {
        test('should correctly calculate limit amounts, USDT > USDC', async () => {
            let amount = pool.getLimitAmountSwap(USDT, USDC, SwapKind.GivenIn);

            expect(amount).toEqual(82089998821185751004412n);

            amount = pool.getLimitAmountSwap(USDT, USDC, SwapKind.GivenOut);

            expect(amount).toEqual(81484918515n);
        });
    });

    describe.skip('normalized liquidity', () => {
        test('should correctly calculate normalized liquidity, USDT > USDC', async () => {
            const normalizedLiquidity = pool.getNormalizedLiquidity(USDT, USDC);

            expect(normalizedLiquidity).toEqual(9478800379870785044596699n);
        });
    });

    describe('Test Swaps', () => {
        describe('SwapExactIn', () => {
            const swapAmount = TokenAmount.fromHumanAmount(USDT, '234.3543');

            test('should correctly calculate amountOut given amountIn', async () => {
                const amountOut = pool.swapGivenIn(USDT, USDC, swapAmount);
                expect(amountOut.amount).toEqual(233628220n);
            });
        });

        describe('SwapExactOut', () => {
            const swapAmount = TokenAmount.fromHumanAmount(USDC, '4523.533437');

            test('should correctly calculate amountIn given amountOut', async () => {
                const amountIn = pool.swapGivenOut(USDT, USDC, swapAmount);
                expect(amountIn.amount).toEqual(4538618913055299390545n);
            });
        });
    });
});
