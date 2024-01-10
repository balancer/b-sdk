// pnpm test -- swap/fxPool.test.ts

import { ChainId, RawFxPool, SwapKind, Token, TokenAmount } from '../../../src';
import testPools from '../../lib/testData/testPools/fx_43667355.json';
import {
    CurveMathRevert,
    FxPool,
    FxPoolToken,
} from '../../../src/entities/pools/fx';
import { parseFixedCurveParam } from '../../../src/entities/pools/fx/helpers';
import { parseUnits } from 'viem';

describe('xaveFxPool: fxPools stub test', () => {
    const chainId = ChainId.POLYGON;
    const testPool = { ...testPools }.pools[0] as RawFxPool;
    const newPool = FxPool.fromRawPool(chainId, testPool);
    const USDC = new Token(
        chainId,
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        6,
        'USDC',
    );
    const XSGD = new Token(
        chainId,
        '0xdc3326e71d45186f113a2f448984ca0e8d201995',
        6,
        'XSGD',
    );

    describe('xaveFxPool: conversion and parse functions', () => {
        const latestFXPrice = '0.74376600';
        const fxOracleDecimals = 8;
        let testToken = new FxPoolToken(
            USDC,
            1n,
            latestFXPrice,
            fxOracleDecimals,
            0,
        );

        test('should correctly return raw amount from numeraire', async () => {
            testToken = FxPoolToken.fromNumeraire(
                testToken,
                parseUnits('10000', 36),
            );
            const expected = 13445088912n;
            expect(testToken.amount).toEqual(expected);
        });

        test('should correctly return large raw amount from numeraire', async () => {
            testToken = FxPoolToken.fromNumeraire(
                testToken,
                parseUnits('10000', 45),
            );
            const expected = 13445088912372977522n;
            expect(testToken.amount).toEqual(expected);
        });

        test('should correctly return numeraire from raw amount', async () => {
            testToken = new FxPoolToken(
                USDC,
                13445088912n,
                latestFXPrice,
                fxOracleDecimals,
                0,
            );
            expect(testToken.numeraire).toEqual(9999999999n * 10n ** 30n);
        });

        test('should correctly parse FXPool parameters', async () => {
            // @todo ABDK's UI (https://toolkit.abdk.consulting/math#convert-number)
            // returns 273437500000000000.867 for '0.2734375'
            expect(parseFixedCurveParam('0.2734375')).toEqual(
                273437500000000000976000000000000000n,
            );
            expect(parseFixedCurveParam('0.8')).toEqual(
                800000000000000000987000000000000000n,
            );
            // @todo ABDK's UI
            // returns 0.00050000000000000099 for '0.0005'
            expect(parseFixedCurveParam('0.0005')).toEqual(
                500000000000000987000000000000000n,
            );
        });
    });

    describe('limit amounts', () => {
        test('getLimitAmountSwap, token to token', async () => {
            const swapKind = SwapKind.GivenIn;
            const amount = newPool.getLimitAmountSwap(USDC, XSGD, swapKind);
            expect(amount).toEqual(960380032958n);
        });
    });

    describe('Test Swaps', () => {
        const testFlow = ({
            tokenIn,
            tokenOut,
            givenAmount,
            swapKind,
            expected,
        }: {
            tokenIn: Token;
            tokenOut: Token;
            givenAmount: string;
            swapKind: SwapKind;
            expected: bigint;
        }) => {
            const { tIn, tOut, givenToken } = newPool.getPoolPairData(
                tokenIn,
                tokenOut,
                parseUnits(givenAmount, tokenIn.decimals),
                swapKind,
            );
            let result: TokenAmount;
            if (swapKind === SwapKind.GivenIn) {
                result = newPool.swapGivenIn(tIn.token, tOut.token, givenToken);
            } else {
                result = newPool.swapGivenOut(
                    tIn.token,
                    tOut.token,
                    givenToken,
                );
            }
            expect(result.amount).toEqual(expected);
        };

        test('Test Case No. 1 - Swap within Beta Region: swapGivenIn USDC > ? XSGD', () => {
            testFlow({
                tokenIn: USDC,
                tokenOut: XSGD,
                givenAmount: '100000',
                swapKind: SwapKind.GivenIn,
                expected: 134652537477n,
            });
        });
        test('Test Case No. 2 - Swap within Beta Region: swapGivenOut ? XSGD > USDC', () => {
            testFlow({
                tokenIn: XSGD,
                tokenOut: USDC,
                givenAmount: '100000',
                swapKind: SwapKind.GivenOut,
                expected: 134787257375n,
            });
        });
        test('Test Case No. 3 - Swap within Beta Region: swapGivenIn XSGD > ? USDC', () => {
            testFlow({
                tokenIn: XSGD,
                tokenOut: USDC,
                givenAmount: '100000',
                swapKind: SwapKind.GivenIn,
                expected: 74190970975n,
            });
        });
        test('Test Case No. 4 - Swap within Beta Region: swapGivenOut ? USDC > XSGD', () => {
            testFlow({
                tokenIn: USDC,
                tokenOut: XSGD,
                givenAmount: '100000',
                swapKind: SwapKind.GivenOut,
                expected: 74265199061n,
            });
        });
        test('Test Case No. 5 - Swap Beyond Beta Region: swapGivenIn USDC > ? XSGD', () => {
            testFlow({
                tokenIn: USDC,
                tokenOut: XSGD,
                givenAmount: '200000',
                swapKind: SwapKind.GivenIn,
                expected: 269305074955n,
            });
        });
        test('Test Case No. 6 - Swap within Beta Region: swapGivenOut ? XSGD > USDC', () => {
            testFlow({
                tokenIn: XSGD,
                tokenOut: USDC,
                givenAmount: '200000',
                swapKind: SwapKind.GivenOut,
                expected: 269980072169n,
            });
        });
        test('Test Case No. 7 - Swap within Beta Region: swapGivenIn XSGD > ? USDC', () => {
            testFlow({
                tokenIn: XSGD,
                tokenOut: USDC,
                givenAmount: '270000',
                swapKind: SwapKind.GivenIn,
                expected: 200011814393n,
            });
        });
        test('Test Case No. 8 - Swap Beyond Beta Region: swapGivenOut ? USDC > XSGD', () => {
            testFlow({
                tokenIn: USDC,
                tokenOut: XSGD,
                givenAmount: '270000',
                swapKind: SwapKind.GivenOut,
                expected: 200516037466n,
            });
        });
        test('Test Case No. 10 - Swap within Beta Region: swapGivenOut ? XSGD > USDC', () => {
            testFlow({
                tokenIn: XSGD,
                tokenOut: USDC,
                givenAmount: '450000',
                swapKind: SwapKind.GivenOut,
                expected: 671920250617n,
            });
        });
        test('Test Case No. 12 - Swap beyond Alpha Region: swapGivenOut ? USDC > XSGD', () => {
            const tokenIn = XSGD;
            const tokenOut = USDC;
            const givenAmount = '610000';
            const swapKind = SwapKind.GivenOut;
            const { tIn, tOut, givenToken } = newPool.getPoolPairData(
                tokenIn,
                tokenOut,
                parseUnits(givenAmount, tokenOut.decimals),
                swapKind,
            );
            expect(() => {
                newPool.swapGivenOut(tIn.token, tOut.token, givenToken);
            }).toThrow(CurveMathRevert.LowerHalt);
        });
    });
});
