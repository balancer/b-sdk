// pnpm test -- test/gyro3Pool.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import testPools from './lib/testData/testPools/gyro3_44133130.json';
import { ChainId } from '../src/utils';
import { RawGyro3Pool } from '../src/data/types';
import {
    BasePool,
    SwapKind,
    SwapOptions,
    Token,
    TokenAmount,
    sorGetSwapsWithPools,
    sorParseRawPools,
} from '../src';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);

describe('gyro3 integration tests', () => {
    const rawPool = { ...testPools }.pools[1] as RawGyro3Pool;
    const USDC = new Token(
        chainId,
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        6,
        'USDC',
    );
    const USDT = new Token(
        chainId,
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        6,
        'USDT',
    );
    const swapOptions: SwapOptions = {
        block: 44133130n,
    };

    let pools: BasePool[];
    beforeEach(() => {
        pools = sorParseRawPools(chainId, [rawPool]);
    });

    describe('ExactIn', () => {
        const swapKind = SwapKind.GivenIn;
        test('should return no swaps when above limit', async () => {
            const tokenIn = USDC;
            const tokenOut = USDT;
            const swapAmount = TokenAmount.fromHumanAmount(USDC, '100000');
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
        test('USDC > USDT, getSwaps result should match query', async () => {
            const tokenIn = USDC;
            const tokenOut = USDT;
            const swapAmount = TokenAmount.fromHumanAmount(USDC, '1.123456');
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
        test('USDT > USDC, getSwaps result should match query', async () => {
            const tokenIn = USDT;
            const tokenOut = USDC;
            const swapAmount = TokenAmount.fromHumanAmount(USDT, '0.999');
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
            const tokenOut = USDT;
            const swapAmount = TokenAmount.fromHumanAmount(USDT, '100000');
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
        test('USDC > USDT, getSwaps result should match query', async () => {
            const tokenIn = USDC;
            const tokenOut = USDT;
            const swapAmount = TokenAmount.fromHumanAmount(USDT, '1.987654');
            const swapInfo = await sorGetSwapsWithPools(
                tokenIn,
                tokenOut,
                swapKind,
                swapAmount,
                pools,
                swapOptions,
            );

            const onchain = await swapInfo?.query(rpcUrl, swapOptions.block);
            expect(onchain).toEqual(swapInfo?.inputAmount);
        });
        test('USDT > USDC, getSwaps result should match query', async () => {
            const tokenIn = USDT;
            const tokenOut = USDC;
            const swapAmount = TokenAmount.fromHumanAmount(USDC, '0.999');
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
