// pnpm test -- test/priceImpact.sor.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import { SmartOrderRouter } from '../src/sor';
import { sorGetSwapsWithPools } from '../src/static';
import { ChainId, ETH, BATCHSIZE, VAULT } from '../src/utils';
import { PriceImpact, Token, TokenAmount } from '../src/entities';
import { OnChainPoolDataEnricher } from '../src/data/enrichers/onChainPoolDataEnricher';
import { SingleSwap, SwapKind, SwapOptions } from '../src/types';
import { BasePool } from '../src/entities/pools';
import { MockPoolProvider } from './lib/utils/mockPoolProvider';

import testPools from './lib/testData/testPools/weighted_17473810.json';
import { RawWeightedPool } from '../src';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('Weighted Swap tests', () => {
    const mockPoolProvider = new MockPoolProvider(
        testPools.pools as RawWeightedPool[],
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

    const BAL = new Token(
        chainId,
        '0xba100000625a3754423978a60c9317c58a424e3D',
        18,
        'BAL',
    );

    const swapOptions: SwapOptions = {
        block: ANVIL_NETWORKS.MAINNET.forkBlockNumber,
    };

    let pools: BasePool[];
    // Since constructing a Swap mutates the pool balances, we refetch for each test
    // May be a better way to deep clone a BasePool[] class instead
    beforeEach(async () => {
        pools = await sor.fetchAndCachePools(swapOptions.block);
    });

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

        const priceImpactSOR = swap.priceImpact;
        const priceImpactSDK = await PriceImpact.singleSwap({
            ...(swap.swaps as SingleSwap),
            rpcUrl,
            chainId,
        });
        expect(priceImpactSOR.amount).toEqual(priceImpactSDK.amount);
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

        const priceImpactSOR = swap.priceImpact;

        const priceImpactSDK = await PriceImpact.singleSwap({
            ...(swap.swaps as SingleSwap),
            rpcUrl,
            chainId,
        });

        expect(priceImpactSOR.amount).toEqual(priceImpactSDK.amount);
    });
});
