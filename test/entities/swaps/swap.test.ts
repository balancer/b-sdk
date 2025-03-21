// pnpm test -- swap.test.ts
import { ChainId, inputValidationError, Slippage } from '@/index';
import { SwapKind } from '@/types';
import {
    Swap,
    Token,
    TokenAmount,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
} from '@/entities';
import { Path, TokenApi } from '@/entities/swap/paths/types';

import { TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.MAINNET;
const wethIsEth = false;

describe('Swap', () => {
    const tokens: TokenApi[] = [
        {
            address: TOKENS[chainId].WETH.address,
            decimals: TOKENS[chainId].WETH.decimals,
        },
        {
            address: TOKENS[chainId].DAI.address,
            decimals: TOKENS[chainId].DAI.decimals,
        },
        {
            address: TOKENS[chainId].USDC.address,
            decimals: TOKENS[chainId].USDC.decimals,
        },
        {
            address: TOKENS[chainId].USDT.address,
            decimals: TOKENS[chainId].USDT.decimals,
        },
    ];

    const pathTo6Decimals: Path = {
        protocolVersion: 2,
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

    describe('path validation', () => {
        const pathWethDai: Path = {
            protocolVersion: 2,
            tokens: [tokens[0], tokens[1]],
            pools: [
                '0xc2aa60465bffa1a88f5ba471a59ca0435c3ec5c100020000000000000000062c',
            ],
            inputAmountRaw: 1000000000000000000n,
            outputAmountRaw: 1000000n,
        };
        test('should throw if paths are not all same Balancer version', () => {
            expect(() => {
                const pathV3: Path = {
                    ...pathWethDai,
                    protocolVersion: 3,
                };
                new Swap({
                    chainId,
                    paths: [pathWethDai, pathV3],
                    swapKind: SwapKind.GivenIn,
                });
            }).toThrowError(
                inputValidationError(
                    'Swap',
                    'All paths must use same Balancer version.',
                ),
            );
        });
        describe('path inputs show all start/end with same token', () => {
            test('should throw if paths start with different token', () => {
                expect(() => {
                    const pathUsdcDai: Path = {
                        ...pathWethDai,
                        tokens: [tokens[2], tokens[1]],
                    };
                    new Swap({
                        chainId,
                        paths: [pathWethDai, pathUsdcDai],
                        swapKind: SwapKind.GivenIn,
                    });
                }).toThrowError(
                    inputValidationError(
                        'Swap',
                        'All paths must start with same token.',
                    ),
                );
            });
            test('should throw if paths end with different token', () => {
                expect(() => {
                    const pathWethUsdc: Path = {
                        ...pathWethDai,
                        tokens: [tokens[0], tokens[2]],
                    };
                    new Swap({
                        chainId,
                        paths: [pathWethDai, pathWethUsdc],
                        swapKind: SwapKind.GivenIn,
                    });
                }).toThrowError(
                    inputValidationError(
                        'Swap',
                        'All paths must end with same token.',
                    ),
                );
            });
            describe('buffers', () => {
                const pathWithBuffers: Path = {
                    protocolVersion: 3,
                    tokens: [
                        {
                            address:
                                '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
                            decimals: 18,
                        }, // DAI
                        {
                            address:
                                '0x8a88124522dbbf1e56352ba3de1d9f78c143751e',
                            decimals: 18,
                        }, // stataToken
                        {
                            address:
                                '0xde46e43f46ff74a23a65ebb0580cbe3dfe684a17',
                            decimals: 6,
                        }, // stataToken
                        {
                            address:
                                '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
                            decimals: 6,
                        }, // USDC
                    ],
                    pools: [
                        '0x8a88124522dbbf1e56352ba3de1d9f78c143751e', // buffer
                        '0x90a46864cb1f042060554592038367e9c97e17f3',
                        '0xde46e43f46ff74a23a65ebb0580cbe3dfe684a17', // buffer
                    ],
                    isBuffer: [true, false, true],
                    inputAmountRaw: 1000000000000000000n,
                    outputAmountRaw: 1000000n,
                };
                test('should throw if buffers used for V2', () => {
                    expect(() => {
                        new Swap({
                            chainId,
                            paths: [
                                {
                                    ...pathWithBuffers,
                                    protocolVersion: 2,
                                },
                            ],
                            swapKind: SwapKind.GivenIn,
                        });
                    }).toThrowError(
                        inputValidationError(
                            'Swap',
                            'Swap with buffers not supported in Balancer v2.',
                        ),
                    );
                });
                test('should throw if buffers not same length as pools', () => {
                    expect(() => {
                        new Swap({
                            chainId,
                            paths: [
                                {
                                    ...pathWithBuffers,
                                    isBuffer: [true, false],
                                },
                            ],
                            swapKind: SwapKind.GivenIn,
                        });
                    }).toThrowError(
                        inputValidationError(
                            'Swap',
                            'buffers and pools must have same length.',
                        ),
                    );
                });
            });
        });
    });

    describe('balancer version', () => {
        test('should be balancer version 2', () => {
            const swap = new Swap({
                chainId,
                paths: [pathTo6Decimals],
                swapKind: SwapKind.GivenIn,
            });
            expect(swap.protocolVersion).to.eq(2);
        });
    });

    describe('buildCall max/min amounts', () => {
        const slippage = Slippage.fromPercentage('0.1');
        const deadline = 999999999999999999n; // Infinity

        describe('GivenIn', () => {
            const swapKind = SwapKind.GivenIn as const;
            const tokenIn = new Token(
                1,
                pathTo6Decimals.tokens[0].address,
                pathTo6Decimals.tokens[0].decimals,
            );

            test('18decimals>6decimals: minAmountOut to be 0.1% less then expected', () => {
                const swap = new Swap({
                    chainId,
                    paths: [pathTo6Decimals],
                    swapKind,
                });
                const tokenOut = new Token(
                    1,
                    pathTo6Decimals.tokens[pathTo6Decimals.tokens.length - 1]
                        .address,
                    pathTo6Decimals.tokens[pathTo6Decimals.tokens.length - 1]
                        .decimals,
                );
                const expectedAmountOut = TokenAmount.fromHumanAmount(
                    tokenOut,
                    '1',
                );
                const callInfo = swap.buildCall({
                    slippage,
                    deadline,
                    queryOutput: {
                        swapKind,
                        expectedAmountOut,
                        to: '0x76fd639005b09140a8616f036B64DaCefe93617B' as `0x${string}`,
                        amountIn: TokenAmount.fromHumanAmount(tokenIn, '1'),
                    },
                    sender: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    recipient: '0x76fd639005b09140a8616f036B64DaCefe93617B',
                    wethIsEth,
                }) as SwapBuildOutputExactIn;

                expect(tokenOut.decimals).to.eq(6);
                expect(callInfo.minAmountOut).to.deep.eq(
                    TokenAmount.fromHumanAmount(tokenOut, '0.999'),
                );
            });
            test('6decimals>18decimals: minAmountOut to be 0.1% less then expected', () => {
                const swap = new Swap({
                    chainId,
                    paths: [pathFrom6Decimals],
                    swapKind,
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
                const expectedAmountOut = TokenAmount.fromHumanAmount(
                    tokenOut,
                    '1',
                );
                const callInfo = swap.buildCall({
                    slippage,
                    deadline,
                    queryOutput: {
                        swapKind,
                        expectedAmountOut,
                        to: '0x76fd639005b09140a8616f036B64DaCefe93617B' as `0x${string}`,
                        amountIn: TokenAmount.fromHumanAmount(tokenIn, '1'),
                    },
                    sender: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    recipient: '0x76fd639005b09140a8616f036B64DaCefe93617B',
                    wethIsEth,
                }) as SwapBuildOutputExactIn;

                expect(tokenOut.decimals).to.eq(18);
                expect(callInfo.minAmountOut).to.deep.eq(
                    TokenAmount.fromHumanAmount(tokenOut, '0.999'),
                );
            });
        });
        describe('GivenOut', () => {
            const swapKind = SwapKind.GivenOut as const;
            const tokenOut = new Token(
                1,
                pathTo6Decimals.tokens[pathTo6Decimals.tokens.length - 1]
                    .address,
                pathTo6Decimals.tokens[pathTo6Decimals.tokens.length - 1]
                    .decimals,
            );

            test('18decimals>6decimals: maxAmountIn to be 0.1% more then expected', () => {
                const swap = new Swap({
                    chainId,
                    paths: [pathTo6Decimals],
                    swapKind,
                });
                const slippage = Slippage.fromPercentage('0.1');
                const tokenIn = new Token(
                    1,
                    pathTo6Decimals.tokens[0].address,
                    pathTo6Decimals.tokens[0].decimals,
                );
                const expectedAmountIn = TokenAmount.fromHumanAmount(
                    tokenIn,
                    '1',
                );

                const callInfo = swap.buildCall({
                    slippage,
                    deadline: 999999999999999999n, // Infinity
                    queryOutput: {
                        swapKind,
                        expectedAmountIn,
                        to: '0x76fd639005b09140a8616f036B64DaCefe93617B' as `0x${string}`,
                        amountOut: TokenAmount.fromHumanAmount(tokenOut, '1'),
                    },
                    sender: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    recipient: '0x76fd639005b09140a8616f036B64DaCefe93617B',
                    wethIsEth,
                }) as SwapBuildOutputExactOut;

                expect(tokenIn.decimals).to.eq(18);
                expect(callInfo.maxAmountIn).to.deep.eq(
                    TokenAmount.fromHumanAmount(tokenIn, '1.001'),
                );
            });
            test('6decimals>18decimals: maxAmountIn to be 0.1% more then expected', () => {
                const swap = new Swap({
                    chainId,
                    paths: [pathFrom6Decimals],
                    swapKind: SwapKind.GivenOut,
                });
                const slippage = Slippage.fromPercentage('0.1');
                const tokenIn = new Token(
                    1,
                    pathFrom6Decimals.tokens[0].address,
                    pathFrom6Decimals.tokens[0].decimals,
                );
                const expectedAmountIn = TokenAmount.fromHumanAmount(
                    tokenIn,
                    '1',
                );

                const callInfo = swap.buildCall({
                    slippage,
                    deadline: 999999999999999999n, // Infinity
                    queryOutput: {
                        swapKind,
                        expectedAmountIn,
                        to: '0x76fd639005b09140a8616f036B64DaCefe93617B' as `0x${string}`,
                        amountOut: TokenAmount.fromHumanAmount(tokenOut, '1'),
                    },
                    sender: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                    recipient: '0x76fd639005b09140a8616f036B64DaCefe93617B',
                    wethIsEth,
                }) as SwapBuildOutputExactOut;

                expect(tokenIn.decimals).to.eq(6);
                expect(callInfo.maxAmountIn).to.deep.eq(
                    TokenAmount.fromHumanAmount(tokenIn, '1.001'),
                );
            });
        });
    });
});
