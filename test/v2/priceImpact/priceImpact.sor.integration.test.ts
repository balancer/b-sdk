// pnpm test -- priceImpact/priceImpact.sor.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

// import { ChainId, ETH } from '../../../src/utils';
// import { PriceImpact, Token, TokenAmount } from '../../../src/entities';
// import { SingleSwap, SwapKind } from '../../../src/types';

// import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
// import { PriceImpactAmount } from '../../../src/entities/priceImpactAmount';

// const chainId = ChainId.MAINNET;
// const blockNumber = 18559730n;
// const { rpcUrl } = await startFork(
//     ANVIL_NETWORKS.MAINNET,
//     undefined,
//     blockNumber,
// );

describe.skip('Price Impact for SOR tests', () => {
    // const BAL = new Token(
    //     chainId,
    //     '0xba100000625a3754423978a60c9317c58a424e3D',
    //     18,
    //     'BAL',
    // );
    // const DAI = new Token(
    //     chainId,
    //     '0x6b175474e89094c44da98b954eedeac495271d0f',
    //     18,
    //     'DAI',
    // );
    // // ETH [80BAL-20WETH] BAL
    // test('givenIn single hop', async () => {
    //     const inputAmount = TokenAmount.fromHumanAmount(ETH, '1');
    //     // Create single swap path ETH>BAL givenIn
    //     if (!swap) throw new Error('Swap is undefined');
    //     const priceImpactSOR = swap.priceImpact;
    //     const priceImpactSDK = await PriceImpact.singleSwap({
    //         ...(swap.swaps as SingleSwap),
    //         rpcUrl,
    //         chainId,
    //     });
    //     expect(priceImpactSOR.decimal).closeTo(priceImpactSDK.decimal, 1e-4);
    // });
    // // ETH [80BAL-20WETH] BAL
    // test('givenOut single hop', async () => {
    //     const outputAmount = TokenAmount.fromHumanAmount(BAL, '100');
    //     // Create single swap path ETH>BAL givenOut
    //     const priceImpactSOR = swap.priceImpact;
    //     const priceImpactSDK = await PriceImpact.singleSwap({
    //         ...(swap.swaps as SingleSwap),
    //         rpcUrl,
    //         chainId,
    //     });
    //     expect(priceImpactSOR.decimal).closeTo(priceImpactSDK.decimal, 1e-4);
    // });
    // // BAL [80BAL-20WETH] WETH [60WETH->40DAI] DAI
    // test('givenIn multiple hops', async () => {
    //     const inputAmount = TokenAmount.fromHumanAmount(BAL, '1000');
    //     // Create multi-hop swap path BAL>DAI givenIn
    //     if (!swap) throw new Error('Swap is undefined');
    //     const priceImpactSOR = swap.priceImpact;
    //     const priceImpactRef = PriceImpactAmount.fromDecimal(`${0.0261}`); // TODO: where can we find a reliable source of truth for this?
    //     expect(priceImpactSOR.decimal).closeTo(priceImpactRef.decimal, 1e-4);
    // });
    // // BAL [80BAL-20WETH] WETH [60WETH->40DAI] DAI
    // test('givenOut multiple hops', async () => {
    //     const outputAmount = TokenAmount.fromHumanAmount(DAI, '4142');
    //     // Create multi-hop swap path BAL>DAI givenOut
    //     const priceImpactSOR = swap.priceImpact;
    //     const priceImpactRef = PriceImpactAmount.fromDecimal(`${0.0285}`); // TODO: where can we find a reliable source of truth for this?
    //     expect(priceImpactSOR.decimal).closeTo(priceImpactRef.decimal, 1e-4);
    // });
});
