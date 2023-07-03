// pnpm test -- fxPool.test.ts

import { ChainId, RawFxPool, SwapKind, Token } from '../src';
import testPools from './lib/testData/fxPool_43667355.json';
import { FxPool } from '../src/entities/pools/fx';

describe('xaveFxPool: fxPools stub test', () => {
    describe('limit amounts', () => {
        test('getLimitAmountSwap, token to token', async () => {
            const testPool = { ...testPools }.pools[0] as RawFxPool;
            const chainId = ChainId.POLYGON;
            const newPool = FxPool.fromRawPool(chainId, testPool);
            const swapKind = SwapKind.GivenIn;
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

            const amount = newPool.getLimitAmountSwap(USDC, XSGD, swapKind);

            expect(amount).toEqual(960380032958n);
        });
    });
});
