// pnpm test -- swap.test.ts
import { ChainId } from '../../src';
import { SwapKind } from '@/types';
import { Swap, Path, Slippage, TokenApi } from '@/entities';
import { TOKENS } from '../lib/utils/addresses';
import { parseUnits } from 'viem';

describe('Swap', () => {
    const inputAmountRaw = 1000000n;
    const outputAmountRaw = 1000000000000000000n;
    const tokens: TokenApi[] = [
        { address: TOKENS[1].WETH.address, decimals: TOKENS[1].WETH.decimals },
        { address: TOKENS[1].DAI.address, decimals: TOKENS[1].DAI.decimals },
        { address: TOKENS[1].USDC.address, decimals: TOKENS[1].USDC.decimals },
        { address: TOKENS[1].USDT.address, decimals: TOKENS[1].USDT.decimals },
    ];

    const path: Path = {
        balancerVersion: 2,
        tokens,
        pools: [
            '0xc2aa60465bffa1a88f5ba471a59ca0435c3ec5c100020000000000000000062c',
            '0xcb444e90d8198415266c6a2724b7900fb12fc56e000000000000000000000011',
            '0x177127622c4a00f3d409b75571e12cb3c8973d3c000000000000000000000011',
        ],
        inputAmountRaw,
        outputAmountRaw,
    };

    describe('limits', () => {
        test('amountIn to be maximally 1% more then expected', () => {
            const swap = new Swap({
                chainId: ChainId.MAINNET,
                paths: [path],
                swapKind: SwapKind.GivenOut,
            });
            const amountIn = swap.inputAmount; // In production code, this would be the expected amountIn returned from the query
            const slippage = Slippage.fromPercentage('1');
            const limits = swap.limits(slippage, amountIn);
            const expected = amountIn.mulDownFixed(
                parseUnits(`${1 + slippage.decimal}`, 18),
            ).amount;

            expect(limits[0]).toEqual(expected);
        });

        test('amountOut to be maximally 1% less then expected', () => {
            const swap = new Swap({
                chainId: ChainId.MAINNET,
                paths: [path],
                swapKind: SwapKind.GivenIn,
            });
            const amountOut = swap.outputAmount; // In production code, this would be the expected amountOut returned from the query
            const slippage = Slippage.fromPercentage('1');
            const limits = swap.limits(slippage, amountOut);
            const expected =
                amountOut.mulDownFixed(
                    parseUnits(`${1 - slippage.decimal}`, 18),
                ).amount * -1n;

            expect(amountOut.amount).not.toEqual(0n);
            expect(limits[3]).toEqual(expected);
        });
    });
});
