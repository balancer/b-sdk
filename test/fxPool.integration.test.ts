// pnpm test -- test/fxPool.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import testPools from './lib/testData/fxPool_43667355.json';
import { ChainId } from '../src/utils';
import { RawFxPool } from '../src/data/types';
import {
    BasePool,
    SwapKind,
    SwapOptions,
    Token,
    TokenAmount,
    sorGetSwapsWithPools,
    sorParseRawPools,
} from '../src';

describe('fx integration tests', () => {
    const chainId = ChainId.POLYGON;
    const rpcUrl = process.env['POLYGON_RPC_URL'] || '';
    const rawPool = { ...testPools }.pools[0] as RawFxPool;
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
    const swapOptions: SwapOptions = {
        block: 43667355n,
    };

    let pools: BasePool[];
    beforeEach(() => {
        pools = sorParseRawPools(chainId, [rawPool]);
    });

    describe('ExactIn', () => {
        const swapKind = SwapKind.GivenIn;
        test('should return no swaps when above limit', async () => {
            const tokenIn = USDC;
            const tokenOut = XSGD;
            const swapAmount = TokenAmount.fromHumanAmount(USDC, '6000000');
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
        test('USDC > XSGD, getSwaps result should match query', async () => {
            const tokenIn = USDC;
            const tokenOut = XSGD;
            const swapAmount = TokenAmount.fromHumanAmount(USDC, '60000');
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
        test('XSGD > USDC, getSwaps result should match query', async () => {
            const tokenIn = XSGD;
            const tokenOut = USDC;
            const swapAmount = TokenAmount.fromHumanAmount(XSGD, '1');
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
            const tokenIn = USDC;
            const tokenOut = XSGD;
            const swapAmount = TokenAmount.fromHumanAmount(XSGD, '6000000');
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
        test('USDC > XSGD, getSwaps result should match query', async () => {
            const tokenIn = USDC;
            const tokenOut = XSGD;
            const swapAmount = TokenAmount.fromHumanAmount(XSGD, '60000');
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
        test('XSGD > USDC, getSwaps result should match query', async () => {
            const tokenIn = XSGD;
            const tokenOut = USDC;
            const swapAmount = TokenAmount.fromHumanAmount(USDC, '1');
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
