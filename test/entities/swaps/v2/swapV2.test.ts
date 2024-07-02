// pnpm test -- swapV2.test.ts
import { ChainId } from '@/index';
import { SwapKind } from '@/types';
import { Token, TokenAmount } from '@/entities';
import { SwapV2 } from '@/entities/swap/swaps/v2';
import { Path, TokenApi } from '@/entities/swap/paths/types';

import { TOKENS } from 'test/lib/utils/addresses';

describe('SwapV2', () => {
    describe('limits', () => {
        describe('batchSwap', () => {
            const tokens: TokenApi[] = [
                {
                    address: TOKENS[1].WETH.address,
                    decimals: TOKENS[1].WETH.decimals,
                },
                {
                    address: TOKENS[1].DAI.address,
                    decimals: TOKENS[1].DAI.decimals,
                },
                {
                    address: TOKENS[1].USDC.address,
                    decimals: TOKENS[1].USDC.decimals,
                },
                {
                    address: TOKENS[1].USDT.address,
                    decimals: TOKENS[1].USDT.decimals,
                },
            ];

            const pathTo6Decimals: Path = {
                vaultVersion: 2,
                tokens,
                pools: [
                    '0xc2aa60465bffa1a88f5ba471a59ca0435c3ec5c100020000000000000000062c',
                    '0xcb444e90d8198415266c6a2724b7900fb12fc56e000000000000000000000011',
                    '0x177127622c4a00f3d409b75571e12cb3c8973d3c000000000000000000000011',
                ],
                inputAmountRaw: 1000000000000000000n,
                outputAmountRaw: 1000000n,
            };

            const pathFrom6Decimals = {
                ...pathTo6Decimals,
                tokens: [...tokens].reverse(),
                inputAmountRaw: 1000000n,
                outputAmountRaw: 1000000000000000000n,
            };

            describe('GivenIn', () => {
                test('18decimals>6decimals: amountOut to be maximally 1% less then expected', () => {
                    const swap = new SwapV2({
                        chainId: ChainId.MAINNET,
                        paths: [pathTo6Decimals],
                        swapKind: SwapKind.GivenIn,
                    });
                    const tokenOut = new Token(
                        1,
                        pathTo6Decimals.tokens[
                            pathTo6Decimals.tokens.length - 1
                        ].address,
                        pathTo6Decimals.tokens[
                            pathTo6Decimals.tokens.length - 1
                        ].decimals,
                    );
                    const minAmountOut = TokenAmount.fromHumanAmount(
                        tokenOut,
                        '0.99',
                    );
                    const limits = swap.limitsBatchSwap(minAmountOut);

                    const expected = [1000000000000000000n, 0n, 0n, -990000n];
                    expect(tokenOut.decimals).to.eq(6);
                    expect(limits).to.deep.eq(expected);
                });
                test('6decimals>18decimals: amountOut to be maximally 1% less then expected', () => {
                    const swap = new SwapV2({
                        chainId: ChainId.MAINNET,
                        paths: [pathFrom6Decimals],
                        swapKind: SwapKind.GivenIn,
                    });
                    const tokenOut = new Token(
                        1,
                        pathFrom6Decimals.tokens[
                            pathFrom6Decimals.tokens.length - 1
                        ].address,
                        pathFrom6Decimals.tokens[
                            pathFrom6Decimals.tokens.length - 1
                        ].decimals,
                    );
                    const minAmountOut = TokenAmount.fromHumanAmount(
                        tokenOut,
                        '0.99',
                    );
                    const limits = swap.limitsBatchSwap(minAmountOut);
                    const expected = [1000000n, 0n, 0n, -990000000000000000n];
                    expect(tokenOut.decimals).to.eq(18);
                    expect(limits).to.deep.eq(expected);
                });
            });
            describe('GivenOut', () => {
                test('18decimals>6decimals: amountIn to be maximally 1% more then expected', () => {
                    const swap = new SwapV2({
                        chainId: ChainId.MAINNET,
                        paths: [pathTo6Decimals],
                        swapKind: SwapKind.GivenOut,
                    });
                    const tokenIn = new Token(
                        1,
                        pathTo6Decimals.tokens[0].address,
                        pathTo6Decimals.tokens[0].decimals,
                    );
                    const maxAmountIn = TokenAmount.fromHumanAmount(
                        tokenIn,
                        '1.01',
                    );
                    const limits = swap.limitsBatchSwap(maxAmountIn);
                    const expected = [1010000000000000000n, 0n, 0n, -1000000n];
                    expect(tokenIn.decimals).to.eq(18);
                    expect(limits).to.deep.eq(expected);
                });

                test('6decimals>18decimals: amountIn to be maximally 1% more then expected', () => {
                    const swap = new SwapV2({
                        chainId: ChainId.MAINNET,
                        paths: [pathFrom6Decimals],
                        swapKind: SwapKind.GivenOut,
                    });
                    const tokenIn = new Token(
                        1,
                        pathFrom6Decimals.tokens[0].address,
                        pathFrom6Decimals.tokens[0].decimals,
                    );
                    const maxAmountIn = TokenAmount.fromHumanAmount(
                        tokenIn,
                        '1.01',
                    );
                    const limits = swap.limitsBatchSwap(maxAmountIn);
                    const expected = [1010000n, 0n, 0n, -1000000000000000000n];
                    expect(tokenIn.decimals).to.eq(6);
                    expect(limits).to.deep.eq(expected);
                });
            });
        });
    });
});
