// // pnpm test -- swap.test.ts
// import { Hex, SwapKind } from '@/types';
// import { Swap, PathWithAmount, Token, TokenAmount, Slippage } from '@/entities';
// import { weightedPoolFactory } from '@/../test/factories/entities/weightedPool';
// import { TOKENS } from '../lib/utils/addresses';
// import { parseUnits } from 'viem';

// const tokens = [
//     new Token(1, TOKENS[1].WETH.address, TOKENS[1].WETH.decimals),
//     new Token(1, TOKENS[1].DAI.address, TOKENS[1].DAI.decimals),
//     new Token(1, TOKENS[1].USDC.address, TOKENS[1].USDC.decimals),
//     new Token(1, TOKENS[1].USDT.address, TOKENS[1].USDT.decimals),
// ];

// const pools = () => [
//     weightedPoolFactory({
//         id: '0x2086f52651837600180de173b09470f54ef74910000000000000000000000001' as Hex,
//         tokens: [
//             {
//                 address: tokens[0].address,
//                 weight: '0.5',
//                 balance: '100000',
//                 decimals: tokens[0].decimals,
//                 symbol: 'XXX',
//                 name: 'XXX Coin',
//                 index: 0,
//             },
//             {
//                 address: tokens[1].address,
//                 weight: '0.5',
//                 balance: '100000',
//                 decimals: tokens[1].decimals,
//                 symbol: 'XXX',
//                 name: 'XXX Coin',
//                 index: 1,
//             },
//         ],
//     }),
//     weightedPoolFactory({
//         id: '0xcb444e90d8198415266c6a2724b7900fb12fc56e000000000000000000000011' as Hex,
//         tokens: [
//             {
//                 address: tokens[1].address,
//                 weight: '0.5',
//                 balance: '100000',
//                 decimals: tokens[1].decimals,
//                 symbol: 'XXX',
//                 name: 'XXX Coin',
//                 index: 0,
//             },
//             {
//                 address: tokens[2].address,
//                 weight: '0.5',
//                 balance: '100000',
//                 decimals: tokens[2].decimals,
//                 symbol: 'XXX',
//                 name: 'XXX Coin',
//                 index: 1,
//             },
//         ],
//     }),
//     weightedPoolFactory({
//         id: '0x177127622c4a00f3d409b75571e12cb3c8973d3c000000000000000000000011' as Hex,
//         tokens: [
//             {
//                 address: tokens[2].address,
//                 weight: '0.5',
//                 balance: '100000',
//                 decimals: tokens[2].decimals,
//                 symbol: 'XXX',
//                 name: 'XXX Coin',
//                 index: 0,
//             },
//             {
//                 address: tokens[3].address,
//                 weight: '0.5',
//                 balance: '100000',
//                 decimals: tokens[3].decimals,
//                 symbol: 'XXX',
//                 name: 'XXX Coin',
//                 index: 1,
//             },
//         ],
//     }),
// ];

// describe('Swap', () => {
//     describe('limits', () => {
//         test('amountIn to be maximally 1% more then expected', () => {
//             const amountOut = TokenAmount.fromRawAmount(tokens[3], 1000000n);
//             const swap = new Swap({
//                 paths: [new PathWithAmount(tokens, pools(), amountOut)],
//                 swapKind: SwapKind.GivenOut,
//             });
//             const amountIn = swap.inputAmount; // In production code, this would be the expected amountIn returned from the query
//             const slippage = Slippage.fromPercentage('1');
//             const limits = swap.limits(slippage, amountIn);
//             const expected = amountIn.mulDownFixed(
//                 parseUnits(`${1 + slippage.decimal}`, 18),
//             ).amount;

//             expect(limits[0]).toEqual(expected);
//         });

//         test('amountOut to be maximally 1% less then expected', () => {
//             const amountIn = TokenAmount.fromRawAmount(
//                 tokens[0],
//                 1000000000000000000n,
//             );
//             const swap = new Swap({
//                 paths: [new PathWithAmount(tokens, pools(), amountIn)],
//                 swapKind: SwapKind.GivenIn,
//             });
//             const amountOut = swap.outputAmount; // In production code, this would be the expected amountOut returned from the query
//             const slippage = Slippage.fromPercentage('1');
//             const limits = swap.limits(slippage, amountOut);
//             const expected =
//                 amountOut.mulDownFixed(
//                     parseUnits(`${1 - slippage.decimal}`, 18),
//                 ).amount * -1n;

//             expect(amountOut.amount).not.toEqual(0n);
//             expect(limits[3]).toEqual(expected);
//         });
//     });
// });
