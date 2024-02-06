// pnpm test -- swap.test.ts
import { Hex, SwapKind } from '@/types';
import { Swap, PathWithAmount, Token, TokenAmount, Slippage } from '@/entities';
import { weightedPoolFactory } from '@/../test/factories/entities/weightedPool';
import { TOKENS } from '../lib/utils/addresses';
import { parseUnits } from 'viem';

describe('Swap', () => {
    describe('limits', () => {
        const tokens = [
            new Token(1, TOKENS[1].WETH.address, TOKENS[1].WETH.decimals),
            new Token(1, TOKENS[1].DAI.address, TOKENS[1].DAI.decimals),
            new Token(1, TOKENS[1].USDC.address, TOKENS[1].USDC.decimals),
            new Token(1, TOKENS[1].USDT.address, TOKENS[1].USDT.decimals),
        ];
        const pools = [
            weightedPoolFactory({
                id: '0x2086f52651837600180de173b09470f54ef74910000000000000000000000001' as Hex,
                tokens: [
                    {
                        address: tokens[0].address,
                        weight: '0.5',
                        balance: String(
                            parseUnits('100000', tokens[0].decimals),
                        ) as `${number}`,
                        decimals: tokens[0].decimals,
                        symbol: 'XXX',
                        name: 'XXX Coin',
                        index: 0,
                    },
                    {
                        address: tokens[1].address,
                        weight: '0.5',
                        balance: String(
                            parseUnits('100000', tokens[1].decimals),
                        ) as `${number}`,
                        decimals: tokens[1].decimals,
                        symbol: 'XXX',
                        name: 'XXX Coin',
                        index: 1,
                    },
                ],
            }),
            weightedPoolFactory({
                id: '0xcb444e90d8198415266c6a2724b7900fb12fc56e000000000000000000000011' as Hex,
                tokens: [
                    {
                        address: tokens[1].address,
                        weight: '0.5',
                        balance: String(
                            parseUnits('100000', tokens[1].decimals),
                        ) as `${number}`,
                        decimals: tokens[1].decimals,
                        symbol: 'XXX',
                        name: 'XXX Coin',
                        index: 0,
                    },
                    {
                        address: tokens[2].address,
                        weight: '0.5',
                        balance: String(
                            parseUnits('100000', tokens[2].decimals),
                        ) as `${number}`,
                        decimals: tokens[2].decimals,
                        symbol: 'XXX',
                        name: 'XXX Coin',
                        index: 1,
                    },
                ],
            }),
            weightedPoolFactory({
                id: '0x177127622c4a00f3d409b75571e12cb3c8973d3c000000000000000000000011' as Hex,
                tokens: [
                    {
                        address: tokens[2].address,
                        weight: '0.5',
                        balance: String(
                            parseUnits('100000', tokens[2].decimals),
                        ) as `${number}`,
                        decimals: tokens[2].decimals,
                        symbol: 'XXX',
                        name: 'XXX Coin',
                        index: 0,
                    },
                    {
                        address: tokens[3].address,
                        weight: '0.5',
                        balance: String(
                            parseUnits('100000', tokens[3].decimals),
                        ) as `${number}`,
                        decimals: tokens[3].decimals,
                        symbol: 'XXX',
                        name: 'XXX Coin',
                        index: 1,
                    },
                ],
            }),
        ];

        test('amountIn to be maximally 1% more then expected', () => {
            const amountOut = TokenAmount.fromRawAmount(tokens[3], 1000000n);
            const swap = new Swap({
                paths: [new PathWithAmount(tokens, pools, amountOut)],
                swapKind: SwapKind.GivenOut,
            });

            const slippage = Slippage.fromPercentage('1');
            const limits = swap.limits(slippage, swap.inputAmount);

            expect(limits[0]).toEqual(swap.inputAmount.mulDownFixed(parseUnits('1.01',18)).amount);
        });

        test('amountOut to be maximally 1% less then expected', () => {
            const amountIn = TokenAmount.fromRawAmount(
                tokens[0],
                1000000000000000000n,
            );
            const swap = new Swap({
                paths: [new PathWithAmount(tokens, pools, amountIn)],
                swapKind: SwapKind.GivenIn,
            });

            const slippage = Slippage.fromPercentage('-1');
            const limits = swap.limits(slippage, amountIn);

            expect(limits[3]).toEqual(-990000000000000000n);
        });
    });
});
