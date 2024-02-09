// pnpm test -- swap/gyro2Pool.test.ts
import dotenv from 'dotenv';
dotenv.config();

import { parseEther } from 'viem';

import testPools from '../../lib/testData/testPools/gyro2.json';
import { MockPoolDataEnricher } from '../../lib/utils/mockPoolEnricher';
import { MockPoolProvider } from '../../lib/utils/mockPoolProvider';
import {
    ChainId,
    RawGyro2Pool,
    SingleSwap,
    SmartOrderRouter,
    SwapLocal,
    SwapKind,
    TokenAmount,
    Token,
} from '../../../src';
import { Gyro2Pool } from '../../../src/entities/pools/gyro2';

describe('Gyro2Pool tests USDC > DAI', () => {
    const testPool = { ...testPools }.pools[0] as RawGyro2Pool;
    const chainId = ChainId.MAINNET;
    const USDC = new Token(
        chainId,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        6,
        'USDC',
    );
    const DAI = new Token(
        chainId,
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        18,
        'DAI',
    );
    const pool = Gyro2Pool.fromRawPool(chainId, testPool);

    // swap USDC -> DAI
    const poolPairData = pool.getPoolPairData(USDC, DAI);

    // Swap DAI -> USDC
    const poolPairData2 = pool.getPoolPairData(DAI, USDC);

    describe('parse pool data', () => {
        test('should correctly parse USDC > DAI', async () => {
            // Tests that compare poolPairData to known results with correct number scaling, etc, i.e.:
            expect(pool.swapFee).toEqual(parseEther(testPool.swapFee));
            expect(pool.id).toEqual(testPool.id);
        });
    });

    describe('parsePoolPairData', () => {
        test('should correctly calculate price bounds USDC > DAI', async () => {
            expect(poolPairData.sqrtAlpha).toEqual(999500374750171757n);
            expect(poolPairData.sqrtBeta).toEqual(1000500375350272092n);
        });

        test('should correctly calculate price bounds DAI > USDC', async () => {
            expect(poolPairData2.sqrtAlpha).toEqual(999499874900000000n);
            expect(poolPairData2.sqrtBeta).toEqual(1000499875000000000n);
        });
    });

    describe('limit amounts', () => {
        test('should correctly calculate limit amounts, USDC > DAI', async () => {
            let amount = pool.getLimitAmountSwap(USDC, DAI, SwapKind.GivenIn);
            expect(amount).toEqual(1243743957825171017111n);

            amount = pool.getLimitAmountSwap(USDC, DAI, SwapKind.GivenOut);
            expect(amount).toEqual(1231998768000000000000n);
        });
    });

    describe.skip('normalized liquidity', () => {
        test('should correctly calculate normalized liquidity, USDC > DAI', async () => {
            const normalizedLiquidity = pool.getNormalizedLiquidity(USDC, DAI);
            expect(normalizedLiquidity).toEqual(1116333916257166990921337n);
        });

        test('should correctly calculate normalized liquidity, DAI > USDC', async () => {
            const normalizedLiquidity = pool.getNormalizedLiquidity(DAI, USDC);
            expect(normalizedLiquidity).toEqual(1116217358286598731855228n);
        });
    });

    describe('Test Swaps', () => {
        describe('SwapExactIn', () => {
            const amountIn = TokenAmount.fromHumanAmount(USDC, '13.5');

            test('should correctly calculate amountOut given amountIn', async () => {
                const amountOut = pool.swapGivenIn(USDC, DAI, amountIn);
                expect(amountOut.amount).toEqual(13379816831223414577n);
            });
        });

        describe('SwapExactOut', () => {
            const amountOut = TokenAmount.fromHumanAmount(DAI, '45.568');

            test('should correctly calculate amountIn given amountOut', async () => {
                const amountIn = pool.swapGivenOut(USDC, DAI, amountOut);
                expect(amountIn.amount).toEqual(45977974n);
            });
        });

        describe('FullSwap', () => {
            test('Full Swap - swapExactIn, Token>Token', async () => {
                const pools = { ...testPools }.pools as RawGyro2Pool[];
                const tokenIn = USDC;
                const tokenOut = DAI;
                const swapKind = SwapKind.GivenIn;
                const swapAmt = TokenAmount.fromHumanAmount(tokenIn, '13.5');

                const rpcUrl = process.env.ETHEREUM_RPC_URL || '';
                const mockPoolProvider = new MockPoolProvider(pools);
                const mockPoolDataEnricher = new MockPoolDataEnricher();

                const sor = new SmartOrderRouter({
                    chainId,
                    rpcUrl,
                    poolDataProviders: mockPoolProvider,
                    poolDataEnrichers: mockPoolDataEnricher,
                });

                const fetchSuccess = await sor.fetchAndCachePools();
                expect(fetchSuccess).toHaveLength(1);

                const swapInfo = (await sor.getSwaps(
                    tokenIn,
                    tokenOut,
                    swapKind,
                    swapAmt,
                )) as SwapLocal;

                const singleSwap = swapInfo.swaps as SingleSwap;

                expect(swapInfo.inputAmount).toEqual(swapAmt);
                expect(singleSwap.poolId).toEqual(testPools.pools[0].id);
                expect(singleSwap.assetIn).toEqual(tokenIn.address);
                expect(singleSwap.assetOut).toEqual(tokenOut.address);
            });
        });
    });
});
