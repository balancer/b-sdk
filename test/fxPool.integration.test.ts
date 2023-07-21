// pnpm test -- test/fxPool.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import { BALANCER_POOL_DATA_QUERIES_ADDRESSES, ChainId } from '../src/utils';
import {
    BasePool,
    OnChainPoolDataEnricher,
    SmartOrderRouter,
    SubgraphPoolProvider,
    SwapKind,
    SwapOptions,
    Token,
    TokenAmount,
    sorGetSwapsWithPools,
} from '../src';

describe('fx integration tests', () => {
    const chainId = ChainId.POLYGON;
    const rpcUrl = process.env['POLYGON_RPC_URL'] || 'https://polygon-rpc.com';

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
        block: 43878700n,
    };

    let sor: SmartOrderRouter;

    beforeAll(() => {
        const subgraphPoolDataService = new SubgraphPoolProvider(
            chainId,
            undefined,
            {
                poolTypeIn: ['FX'],
            },
        );
        const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
            chainId,
            rpcUrl,
            BALANCER_POOL_DATA_QUERIES_ADDRESSES[chainId],
            {
                loadSwapFees: false,
            },
        );

        sor = new SmartOrderRouter({
            chainId,
            poolDataProviders: subgraphPoolDataService,
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
