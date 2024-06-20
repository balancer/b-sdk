// pnpm test -- swapV3.test.ts
import { ChainId } from '../../src';
import { SwapKind } from '@/types';
import { TOKENS } from '../lib/utils/addresses';
import {
    SwapPathExactAmountIn,
    SwapPathExactAmountOut,
    SwapV3,
} from '@/entities/swap/swaps/v3';
import { Path, TokenApi } from '@/entities/swap/paths/types';

describe('SwapV3', () => {
    describe('getSwaps', () => {
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

            const path1hop: Path = {
                protocolVersion: 3,
                tokens: [tokens[0], tokens[3]],
                pools: [
                    '0xc2aa60465bffa1a88f5ba471a59ca0435c3ec5c100020000000000000000062c',
                ],
                inputAmountRaw: 2000000000000000000n,
                outputAmountRaw: 2000000n,
            };
            const path3hops: Path = {
                protocolVersion: 3,
                tokens,
                pools: [
                    '0xc2aa60465bffa1a88f5ba471a59ca0435c3ec5c100020000000000000000062c',
                    '0xcb444e90d8198415266c6a2724b7900fb12fc56e000000000000000000000011',
                    '0x177127622c4a00f3d409b75571e12cb3c8973d3c000000000000000000000011',
                ],
                inputAmountRaw: 1000000000000000000n,
                outputAmountRaw: 1000000n,
            };

            describe('GivenIn', () => {
                test('swaps should be created correctly', () => {
                    const swap = new SwapV3({
                        chainId: ChainId.MAINNET,
                        paths: [path1hop, path3hops],
                        swapKind: SwapKind.GivenIn,
                    });
                    const expected1hop: SwapPathExactAmountIn = {
                        tokenIn: path1hop.tokens[0].address,
                        exactAmountIn: path1hop.inputAmountRaw,
                        steps: [
                            {
                                pool: path1hop.pools[0],
                                tokenOut: path1hop.tokens[1].address,
                            },
                        ],
                    };
                    const expected3hops: SwapPathExactAmountIn = {
                        tokenIn: path3hops.tokens[0].address,
                        exactAmountIn: path3hops.inputAmountRaw,
                        steps: [
                            {
                                pool: path3hops.pools[0],
                                tokenOut: path3hops.tokens[1].address,
                            },
                            {
                                pool: path3hops.pools[1],
                                tokenOut: path3hops.tokens[2].address,
                            },
                            {
                                pool: path3hops.pools[2],
                                tokenOut: path3hops.tokens[3].address,
                            },
                        ],
                    };

                    expect(swap.swaps).to.deep.eq([
                        expected1hop,
                        expected3hops,
                    ]);
                });
            });
            describe('GivenOut', () => {
                test('swaps should be created correctly', () => {
                    const swap = new SwapV3({
                        chainId: ChainId.MAINNET,
                        paths: [path1hop, path3hops],
                        swapKind: SwapKind.GivenOut,
                    });
                    const expected1hop: SwapPathExactAmountOut = {
                        tokenIn: path1hop.tokens[0].address,
                        exactAmountOut: path1hop.outputAmountRaw,
                        steps: [
                            {
                                pool: path1hop.pools[0],
                                tokenOut: path1hop.tokens[1].address,
                            },
                        ],
                    };
                    const expected3hops: SwapPathExactAmountOut = {
                        tokenIn: path3hops.tokens[0].address,
                        exactAmountOut: path3hops.outputAmountRaw,
                        steps: [
                            {
                                pool: path3hops.pools[0],
                                tokenOut: path3hops.tokens[1].address,
                            },
                            {
                                pool: path3hops.pools[1],
                                tokenOut: path3hops.tokens[2].address,
                            },
                            {
                                pool: path3hops.pools[2],
                                tokenOut: path3hops.tokens[3].address,
                            },
                        ],
                    };

                    expect(swap.swaps).to.deep.eq([
                        expected1hop,
                        expected3hops,
                    ]);
                });
            });
        });
    });
});
