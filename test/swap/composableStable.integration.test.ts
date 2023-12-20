// pnpm test -- swap/composableStable.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import { SmartOrderRouter } from '../../src/sor';
import { sorGetSwapsWithPools } from '../../src/static';
import { ChainId, BATCHSIZE, VAULT } from '../../src/utils';
import { Token, TokenAmount } from '../../src/entities';
import { OnChainPoolDataEnricher } from '../../src/data/enrichers/onChainPoolDataEnricher';
import { SwapKind, SwapOptions } from '../../src/types';
import { BasePool } from '../../src/entities/pools';
import { MockPoolProvider } from '../lib/utils/mockPoolProvider';

import testPools from '../lib/testData/testPools/composableStable_17473810.json';
import { RawStablePool } from '../../src';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('ComposableStable Swap tests', () => {
    const chainId = ChainId.MAINNET;
    const mockPoolProvider = new MockPoolProvider(
        testPools.pools as RawStablePool[],
    );
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        chainId,
        rpcUrl,
        BATCHSIZE[chainId],
        VAULT[chainId],
    );

    const sor = new SmartOrderRouter({
        chainId,
        poolDataProviders: mockPoolProvider,
        poolDataEnrichers: onChainPoolDataEnricher,
        rpcUrl: rpcUrl,
    });

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

    test('DAI -> USDT givenIn ComposableStable', async () => {
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
        expect(swap.paths[0].pools.length).toEqual(1);
    });

    test('USDC -> DAI givenOut ComposableStable', async () => {
        const outputAmount = TokenAmount.fromHumanAmount(DAI, '1000000');

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
