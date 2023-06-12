// pnpm test -- test/gyro2Pool.test.ts
import dotenv from 'dotenv';
dotenv.config();

import testPools from './lib/testData/gyro2TestPool.json';
import {
    RawGyro2Pool,
    SwapKind,
    TokenAmount,
    ChainId,
    SmartOrderRouter,
    Swap,
    Token,
    SingleSwap,
    OnChainPoolDataEnricher,
} from '../src';

import { Gyro2Pool } from '../src/entities/pools/gyro2';
import { formatEther, parseEther } from 'viem';
import { MockPoolProvider } from './lib/utils/mockPoolProvider';
import { MockPoolDataEnricher } from './lib/utils/mockPoolEnricher';

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
            expect(Number(formatEther(poolPairData.sqrtAlpha))).toBeCloseTo(
                0.9995003747,
                0.00000001,
            );

            expect(Number(formatEther(poolPairData.sqrtBeta))).toBeCloseTo(
                1.000500375,
                0.00000001,
            );
        });

        test('should correctly calculate price bounds DAI > USDC', async () => {
            expect(Number(formatEther(poolPairData2.sqrtAlpha))).toBeCloseTo(
                0.9994998749,
                0.00000001,
            );

            expect(Number(formatEther(poolPairData2.sqrtBeta))).toBeCloseTo(
                1.000499875,
                0.00000001,
            );
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

            expect(Number(formatEther(normalizedLiquidity))).toBeCloseTo(
                1116333.916257166990921337,
                0.00001,
            );
        });

        test('should correctly calculate normalized liquidity, DAI > USDC', async () => {
            const normalizedLiquidity = pool.getNormalizedLiquidity(DAI, USDC);

            expect(Number(formatEther(normalizedLiquidity))).toBeCloseTo(
                1116217.358286598731855228,
                0.00001,
            );
        });
    });

    describe('Test Swaps', () => {
        describe('SwapExactIn', () => {
            const amountIn = TokenAmount.fromHumanAmount(USDC, '13.5');

            test('should correctly calculate amountOut given amountIn', async () => {
                const amountOut = pool.swapGivenIn(USDC, DAI, amountIn);
                expect(amountOut.amount).toEqual(13379816831223414577n);
            });
            test.skip('should correctly calculate newSpotPrice', async () => {
                const newSpotPrice = pool.spotPriceAfterSwapGivenIn(
                    USDC,
                    DAI,
                    amountIn,
                );
                expect(newSpotPrice.toString()).toEqual(1008988469190824523n);
            });
            test.skip('should correctly calculate derivative of spot price function at newSpotPrice', async () => {
                const derivative = pool.derivativeSpotPriceAfterSwapGivenIn(
                    USDC,
                    DAI,
                    amountIn,
                );
                expect(derivative.toString()).toEqual(895794688507n);
            });
        });

        describe('SwapExactOut', () => {
            const amountOut = TokenAmount.fromHumanAmount(DAI, '45.568');

            test('should correctly calculate amountIn given amountOut', async () => {
                const amountIn = pool.swapGivenOut(USDC, DAI, amountOut);
                expect(amountIn.amount).toEqual(45977973n);
            });
            test.skip('should correctly calculate newSpotPrice', async () => {
                const newSpotPrice = pool.spotPriceAfterSwapGivenOut(
                    USDC,
                    DAI,
                    amountOut,
                );
                expect(newSpotPrice).toEqual(100901756299705875n);
            });
            test.skip('should correctly calculate derivative of spot price function at newSpotPrice', async () => {
                const derivative = pool.derivativeSpotPriceAfterSwapGivenOut(
                    USDC,
                    DAI,
                    amountOut,
                );
                expect(derivative.toString()).toEqual(903885604863n);
            });
        });

        describe('FullSwap', () => {
            test('Full Swap - swapExactIn, Token>Token', async () => {
                const pools = { ...testPools }.pools as RawGyro2Pool[];
                const tokenIn = USDC;
                const tokenOut = DAI;
                const swapKind = SwapKind.GivenIn;
                const swapAmt = TokenAmount.fromHumanAmount(tokenIn, '13.5');

                const rpcUrl = process.env['ETHEREUM_RPC_URL'] || '';
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
                )) as Swap;

                const singleSwap = swapInfo.swaps as SingleSwap;

                expect(swapInfo.inputAmount).toEqual(swapAmt);
                expect(singleSwap.poolId).toEqual(testPools.pools[0].id);
                expect(singleSwap.assetIn).toEqual(tokenIn.address);
                expect(singleSwap.assetOut).toEqual(tokenOut.address);
            });
        });
    });
});
