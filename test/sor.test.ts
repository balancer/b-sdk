import dotenv from 'dotenv';
dotenv.config();

import { SmartOrderRouter } from '../src/sor';
import { sorGetSwapsWithPools } from '../src/static';
import { SubgraphPoolProvider } from '../src/data/providers/subgraphPoolProvider';
import { ChainId, ETH } from '../src/utils';
import { Token, TokenAmount } from '../src/entities';
import { OnChainPoolDataEnricher } from '../src/data/enrichers/onChainPoolDataEnricher';
import { SwapKind, SwapOptions } from '../src/types';
import { BasePool } from '../src/entities/pools';

const SOR_QUERIES = '0x1814a3b3e4362caf4eb54cd85b82d39bd7b34e41';

describe('SmartOrderRouter', () => {
    describe('Mainnet', () => {
        const chainId = ChainId.MAINNET;
        const rpcUrl = process.env['ETHEREUM_RPC_URL'] || '';
        const subgraphPoolDataService = new SubgraphPoolProvider(chainId);
        const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
            rpcUrl,
            SOR_QUERIES,
            {
                loadAmpForPools: {
                    poolTypes: ['ComposableStable'],
                },
            },
        );

        const sor = new SmartOrderRouter({
            chainId,
            poolDataProviders: subgraphPoolDataService,
            poolDataEnrichers: onChainPoolDataEnricher,
            rpcUrl: rpcUrl,
        });

        const BAL = new Token(
            chainId,
            '0xba100000625a3754423978a60c9317c58a424e3D',
            18,
            'BAL',
        );
        const USDC = new Token(
            chainId,
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            6,
            'USDC',
        );
        const USDT = new Token(
            chainId,
            '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            6,
            'USDT',
        );
        const DAI = new Token(
            chainId,
            '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            18,
            'DAI',
        );

        const swapOptions: SwapOptions = {
            block: 17473810n,
        };

        let pools: BasePool[];
        // Since constructing a Swap mutates the pool balances, we refetch for each test
        // May be a better way to deep clone a BasePool[] class instead
        beforeEach(async () => {
            pools = await sor.fetchAndCachePools(swapOptions.block);
        });

        describe('Weighted Pools', () => {
            // ETH -> BAL swapGivenIn single hop
            // Weighted pool
            // 0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014
            test('Native ETH -> Token givenIn single hop', async () => {
                const inputAmount = TokenAmount.fromHumanAmount(ETH, '1');

                const swap = await sorGetSwapsWithPools(
                    ETH,
                    BAL,
                    SwapKind.GivenIn,
                    inputAmount,
                    pools,
                    swapOptions,
                );

                if (!swap) throw new Error('Swap is undefined');

                const onchain = await swap.query(rpcUrl, swapOptions.block);

                expect(swap.quote.amount).toEqual(onchain.amount);
                expect(swap.inputAmount.amount).toEqual(inputAmount.amount);
                expect(swap.outputAmount.amount).toEqual(swap.quote.amount);
                expect(swap.paths.length).toEqual(1);
                expect(swap.paths[0].pools.length).toEqual(1);
                expect(swap.paths[0].pools[0].id).toEqual(
                    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
                );
            });

            // ETH -> BAL swapGivenOut single hop
            // Weighted pool
            // 0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014
            test('Native ETH -> Token givenOut single hop', async () => {
                const outputAmount = TokenAmount.fromHumanAmount(BAL, '100');

                const swap = await sorGetSwapsWithPools(
                    ETH,
                    BAL,
                    SwapKind.GivenOut,
                    outputAmount,
                    pools,
                    swapOptions,
                );

                if (!swap) throw new Error('Swap is undefined');

                const onchain = await swap.query(rpcUrl, swapOptions.block);

                expect(swap.quote.amount).toEqual(onchain.amount);
                expect(swap.inputAmount.amount).toEqual(swap.quote.amount);
                expect(swap.outputAmount.amount).toEqual(outputAmount.amount);
                expect(swap.paths.length).toEqual(1);
                expect(swap.paths[0].pools.length).toEqual(1);
                expect(swap.paths[0].pools[0].id).toEqual(
                    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
                );
            });
        });

        describe('Stable Pools', () => {
            // DAI -> bb-a-DAI -> bb-a-USDT -> USDT swapGivenIn boosted
            // Aave Linear + Boosted Pool
            // 0x6667c6fa9f2b3fc1cc8d85320b62703d938e43850000000000000000000004fb
            // 0xfebb0bbf162e64fb9d0dfe186e517d84c395f016000000000000000000000502
            // 0xa1697f9af0875b63ddc472d6eebada8c1fab85680000000000000000000004f9
            test('DAI -> USDT givenIn boosted', async () => {
                const inputAmount = TokenAmount.fromHumanAmount(DAI, '100000');

                const swap = await sorGetSwapsWithPools(
                    DAI,
                    USDT,
                    SwapKind.GivenIn,
                    inputAmount,
                    pools,
                    swapOptions,
                );

                if (!swap) throw new Error('Swap is undefined');

                const onchain = await swap.query(rpcUrl, swapOptions.block);
                expect(swap.quote.amount).toEqual(onchain.amount);
                expect(swap.inputAmount.amount).toEqual(inputAmount.amount);
                expect(swap.outputAmount.amount).toEqual(swap.quote.amount);
                expect(swap.paths.length).toEqual(1);
                expect(swap.paths[0].pools.length).toEqual(3);
            });

            // DAI -> bb-a-DAI -> bb-a-USDT -> USDT swapGivenOut boosted
            // Aave Linear + Boosted Pool
            // 0x6667c6fa9f2b3fc1cc8d85320b62703d938e43850000000000000000000004fb
            // 0xfebb0bbf162e64fb9d0dfe186e517d84c395f016000000000000000000000502
            // 0xa1697f9af0875b63ddc472d6eebada8c1fab85680000000000000000000004f9
            test('USDC -> DAI givenOut boosted', async () => {
                const outputAmount = TokenAmount.fromHumanAmount(
                    DAI,
                    '1000000',
                );

                const swap = await sorGetSwapsWithPools(
                    USDC,
                    DAI,
                    SwapKind.GivenOut,
                    outputAmount,
                    pools,
                    swapOptions,
                );

                if (!swap) throw new Error('Swap is undefined');

                const onchain = await swap.query(rpcUrl, swapOptions.block);
                expect(swap.quote.amount).toEqual(onchain.amount);
            });
        });
    });
});
