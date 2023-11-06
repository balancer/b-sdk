// pnpm test -- test/fxPool.integration.test.ts
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import { BATCHSIZE, ChainId, VAULT } from '../src/utils';
import {
    BasePool,
    OnChainPoolDataEnricher,
    RawFxPool,
    SmartOrderRouter,
    SwapKind,
    SwapOptions,
    Token,
    TokenAmount,
    sorGetSwapsWithPools,
} from '../src';
import { MockPoolProvider } from './lib/utils/mockPoolProvider';
import testPools from './lib/testData/testPools/fx_43667355.json';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);

describe('fx integration tests', () => {
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

    let sor: SmartOrderRouter;

    beforeAll(() => {
        const pools = testPools.pools as RawFxPool[];
        const mockPoolProvider = new MockPoolProvider(pools);

        const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
            chainId,
            rpcUrl,
            BATCHSIZE[chainId],
            VAULT[chainId],
        );

        sor = new SmartOrderRouter({
            chainId,
            poolDataProviders: mockPoolProvider,
            poolDataEnrichers: onChainPoolDataEnricher,
            rpcUrl: rpcUrl,
        });
    });

    let pools: BasePool[];
    beforeEach(async () => {
        pools = await sor.fetchAndCachePools(swapOptions.block);
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
