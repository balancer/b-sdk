// pnpm test -- test/gyroEV2Pool.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import { ChainId } from '../src/utils';
import {
    BasePool,
    OnChainPoolDataEnricher,
    SmartOrderRouter,
    SubgraphPoolProvider,
    SwapKind,
    SwapOptions,
    Token,
    sorGetSwapsWithPools,
} from '../src';
import { parseEther } from 'viem';
import { GyroEPool, GyroEPoolToken } from '../src/entities/pools/gyroE';

const SOR_QUERIES = '0x1814a3b3e4362caf4eb54cd85b82d39bd7b34e41';

describe('gyroEV2: WMATIC-stMATIC integration tests', () => {
    const chainId = ChainId.POLYGON;
    const rpcUrl = process.env['POLYGON_RPC_URL'] || '';
    const WMATIC = new Token(
        chainId,
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        18,
        'WMATIC',
    );
    const stMATIC = new Token(
        chainId,
        '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
        18,
        'stMATIC',
    );
    const swapOptions: SwapOptions = {
        block: 44215395n,
    };
    let sor: SmartOrderRouter;

    beforeAll(() => {
        const subgraphPoolDataService = new SubgraphPoolProvider(
            chainId,
            undefined,
            {
                poolIdIn: [
                    '0xf0ad209e2e969eaaa8c882aac71f02d8a047d5c2000200000000000000000b49',
                ],
                gqlAdditionalPoolQueryFields: `
                alpha
                beta
                c
                s
                lambda
                tauAlphaX
                tauAlphaY
                tauBetaX
                tauBetaY
                u
                v
                w
                z
                dSq
                `,
            },
        );
        const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
            rpcUrl,
            SOR_QUERIES,
            {
                loadTokenRatesForPools: {
                    poolTypes: ['GyroE'],
                    poolTypeVersions: [2],
                },
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
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const swapAmount = parseEther('11206540');
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
        test('token > LSD, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tIn } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenIn,
                parseEther('1.12345678'),
                tIn.rate,
                tIn.index,
            );
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
        test('LSD > token, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = stMATIC;
            const tokenOut = WMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tIn } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenIn,
                parseEther('0.999'),
                tIn.rate,
                tIn.index,
            );
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
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const swapAmount = parseEther('303106');
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
        test('token > LSD, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = WMATIC;
            const tokenOut = stMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tOut } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenOut,
                parseEther('1.987654321'),
                tOut.rate,
                tOut.index,
            );
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
        test('LSD > token, getSwaps result should match queryBatchSwap', async () => {
            const tokenIn = stMATIC;
            const tokenOut = WMATIC;
            const gyroPool = pools[0] as GyroEPool;
            const { tOut } = gyroPool.getRequiredTokenPair(tokenIn, tokenOut);
            const swapAmount = new GyroEPoolToken(
                tokenOut,
                parseEther('0.999'),
                tOut.rate,
                tOut.index,
            );
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
