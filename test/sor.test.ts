import dotenv from 'dotenv';
dotenv.config();

import { JsonRpcProvider } from '@ethersproject/providers';
import { SmartOrderRouter } from '../src/sor';
import { SubgraphPoolProvider } from '../src/data/providers/subgraphPoolProvider';
import { ChainId, ETH, SUBGRAPH_URLS } from '../src/utils';
import { Token, TokenAmount } from '../src/entities';
import { OnChainPoolDataEnricher } from '../src/data/enrichers/onChainPoolDataEnricher';
import { SwapKind, SwapOptions } from '../src/types';

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

const VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const SOR_QUERIES = '0x40f7218fa50ead995c4343eB0bB46dD414F9da7A';

describe('SmartOrderRouter', () => {
    describe('Mainnet', () => {
        const chainId = ChainId.MAINNET;
        const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
        const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
        const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
            VAULT,
            SOR_QUERIES,
            process.env['ETHEREUM_RPC_URL']!,
        );

        const sor = new SmartOrderRouter({
            chainId,
            provider,
            poolDataProviders: subgraphPoolDataService,
            poolDataEnrichers: onChainPoolDataEnricher,
        });

        const BAL = new Token(chainId, '0xba100000625a3754423978a60c9317c58a424e3D', 18, 'BAL');
        const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');
        const USDC = new Token(chainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC');
        const USDT = new Token(chainId, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 'USDT');
        const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI');

        const swapOptions: SwapOptions = {
            block: 16500000,
        };

        describe('Weighted Pools', () => {
            // ETH -> BAL swapGivenIn single hop
            // Weighted pool
            // 0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014
            // Block 16500000
            test('ETH -> Token givenIn single hop', async () => {
                const inputAmount = TokenAmount.fromHumanAmount(ETH, '1');

                const { swap, quote } = await sor.getSwaps(
                    ETH,
                    BAL,
                    SwapKind.GivenIn,
                    inputAmount,
                    swapOptions,
                );
                const onchain = await swap.query(provider, swapOptions.block);

                expect(quote.amount).toEqual(onchain.amount);
                expect(swap.inputAmount.amount).toEqual(inputAmount.amount);
                expect(swap.outputAmount.amount).toEqual(quote.amount);
                expect(swap.paths.length).toEqual(1);
                expect(swap.paths[0].path.pools.length).toEqual(1);
                expect(swap.paths[0].path.pools[0].id).toEqual(
                    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
                );
            });

            // WETH -> USDC swapGivenOut single hop
            // Weighted pool
            // 0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019
            // Block 16500000
            test('WETH -> Token givenOut single hop', async () => {
                const outputAmount = TokenAmount.fromHumanAmount(USDC, '1000');

                const { swap, quote } = await sor.getSwaps(
                    WETH,
                    USDC,
                    SwapKind.GivenOut,
                    outputAmount,
                    swapOptions,
                );
                const onchain = await swap.query(provider, swapOptions.block);

                expect(quote.amount).toEqual(onchain.amount);
                expect(quote.amount).toEqual(627241739327765205n);
                expect(swap.inputAmount.amount).toEqual(quote.amount);
                expect(swap.outputAmount.amount).toEqual(outputAmount.amount);
                expect(swap.paths.length).toEqual(1);
                expect(swap.paths[0].path.pools.length).toEqual(1);
                expect(swap.paths[0].path.pools[0].id).toEqual(
                    '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
                );
            });
        });

        describe('Stable Pools', () => {
            // DAI -> bb-a-DAI -> bb-a-USDT -> USDT swapGivenIn boosted
            // Aave Linear + Boosted Pool
            // 0xae37d54ae477268b9997d4161b96b8200755935c000000000000000000000337
            // 0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d
            // 0x2f4eb100552ef93840d5adc30560e5513dfffacb000000000000000000000334
            // Block 16500000
            test('DAI -> USDT givenIn boosted', async () => {
                const inputAmount = TokenAmount.fromHumanAmount(DAI, '100000');

                const { swap, quote } = await sor.getSwaps(
                    DAI,
                    USDT,
                    SwapKind.GivenIn,
                    inputAmount,
                    swapOptions,
                );

                const onchain = await swap.query(provider, swapOptions.block);
                expect(quote.amount).toEqual(onchain.amount);
            });

            // DAI -> bb-a-DAI -> bb-a-USDT -> USDT swapGivenIn boosted
            // Aave Linear + Boosted Pool
            // 0xae37d54ae477268b9997d4161b96b8200755935c000000000000000000000337
            // 0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d
            // 0x2f4eb100552ef93840d5adc30560e5513dfffacb000000000000000000000334
            // Block 16500000
            test('USDC -> DAI givenOut boosted', async () => {
                const outputAmount = TokenAmount.fromHumanAmount(DAI, '1000000');

                const { swap, quote } = await sor.getSwaps(
                    USDC,
                    DAI,
                    SwapKind.GivenOut,
                    outputAmount,
                    swapOptions,
                );

                const onchain = await swap.query(provider, swapOptions.block);
                expect(quote.amount).toEqual(onchain.amount);
            });
        });
    });
});

// export async function testStableOut(): Promise<void> {
//     const chainId = ChainId.MAINNET;
//     const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
//     const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
//     const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
//         VAULT,
//         SOR_QUERIES,
//         process.env['ETHEREUM_RPC_URL']!,
//     );
//     const aaveReserveEnricher = new AaveReserveEnricher();

//     const sor = new SmartOrderRouter({
//         chainId,
//         provider,
//         poolDataProviders: subgraphPoolDataService,
//         poolDataEnrichers: aaveReserveEnricher,
//     });

//     const USDC = new Token(chainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC');
//     const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI');
//     const outputAmount = TokenAmount.fromHumanAmount(DAI, '100');

//     const { swap, quote } = await sor.getSwaps(USDC, DAI, 1, outputAmount);

//     const onchain = await swap.query(provider);
//     console.log(quote);
//     console.log(onchain);
// }

// // testWeightIn();
// // testWeightOut();
// testStableIn();
// // testStableOut();
