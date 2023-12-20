// pnpm test -- swap/fantom.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import { SmartOrderRouter } from '../../src/sor';
import { sorGetSwapsWithPools } from '../../src/static';
import { ChainId, NATIVE_ASSETS, BATCHSIZE, VAULT } from '../../src/utils';
import { Token, TokenAmount } from '../../src/entities';
import { OnChainPoolDataEnricher } from '../../src/data/enrichers/onChainPoolDataEnricher';
import { SwapKind, SwapOptions } from '../../src/types';
import { BasePool } from '../../src/entities/pools';
import { MockPoolProvider } from '../lib/utils/mockPoolProvider';

import testPools from '../lib/testData/testPools/fantom_65313450.json';
import { RawBasePool } from '../../src';

import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';

describe.skip('Fantom SOR', () => {
    let pools: BasePool[];
    let inputToken: Token;
    let sor: SmartOrderRouter;
    let BEETS: Token;
    let swapOptions: SwapOptions;
    let rpcUrl: string;

    beforeAll(async () => {
        const chainId = ChainId.FANTOM;
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.FANTOM));

        inputToken = NATIVE_ASSETS[chainId];
        const mockPoolProvider = new MockPoolProvider(
            testPools.pools as RawBasePool[],
        );
        const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
            chainId,
            rpcUrl,
            BATCHSIZE[chainId],
            VAULT[chainId],
        );

        sor = new SmartOrderRouter({
            chainId,
            poolDataProviders: mockPoolProvider,
            poolDataEnrichers: onChainPoolDataEnricher,
            rpcUrl,
        });

        BEETS = new Token(
            chainId,
            '0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e',
            18,
            'BEETS',
        );

        swapOptions = {
            block: 65313450n,
        };
    });

    // Since constructing a Swap mutates the pool balances, we refetch for each test
    // May be a better way to deep clone a BasePool[] class instead
    beforeEach(async () => {
        pools = await sor.fetchAndCachePools(swapOptions.block);
    });

    describe('Native Swaps', () => {
        test('Native -> Token givenIn', async () => {
            const inputAmount = TokenAmount.fromHumanAmount(inputToken, '100');

            const swap = await sorGetSwapsWithPools(
                inputToken,
                BEETS,
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
        });

        test('Native ETH -> Token givenOut', async () => {
            const outputAmount = TokenAmount.fromHumanAmount(BEETS, '100000');

            const swap = await sorGetSwapsWithPools(
                inputToken,
                BEETS,
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
        });
    });
});
