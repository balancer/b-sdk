// pnpm test -- priceImpact/priceImpact.sor.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { SmartOrderRouter } from '../../../src/sor';
import { sorGetSwapsWithPools } from '../../../src/static';
import { ChainId, ETH, BATCHSIZE, VAULT } from '../../../src/utils';
import { PriceImpact, Token, TokenAmount } from '../../../src/entities';
import { OnChainPoolDataEnricher } from '../../../src/data/enrichers/onChainPoolDataEnricher';
import { SingleSwap, SwapKind, SwapOptions } from '../../../src/types';
import { BasePool } from '../../../src/entities/pools';
import { MockPoolProvider } from '../../lib/utils/mockPoolProvider';

import testPools from '../../lib/testData/testPools/weighted_17473810.json';
import { RawWeightedPool } from '../../../src';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { PriceImpactAmount } from '../../../src/entities/priceImpactAmount';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('Price Impact for SOR tests', () => {
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

    const DAI = new Token(
        chainId,
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        18,
        'DAI',
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

    // ETH [80BAL-20WETH] BAL
    test('givenIn single hop', async () => {
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
        expect(priceImpactSOR.decimal).closeTo(priceImpactSDK.decimal, 1e-4);
    });

    // ETH [80BAL-20WETH] BAL
    test('givenOut single hop', async () => {
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

        expect(priceImpactSOR.decimal).closeTo(priceImpactSDK.decimal, 1e-4);
    });

    // BAL [80BAL-20WETH] WETH [60WETH->40DAI] DAI
    test('givenIn multiple hops', async () => {
        const inputAmount = TokenAmount.fromHumanAmount(BAL, '1000');

        const swap = await sorGetSwapsWithPools(
            BAL,
            DAI,
            SwapKind.GivenIn,
            inputAmount,
            pools,
            swapOptions,
        );

        if (!swap) throw new Error('Swap is undefined');

        const priceImpactSOR = swap.priceImpact;
        const priceImpactRef = PriceImpactAmount.fromDecimal(`${0.0261}`); // TODO: where can we find a reliable source of truth for this?

        expect(priceImpactSOR.decimal).closeTo(priceImpactRef.decimal, 1e-4);
    });

    // BAL [80BAL-20WETH] WETH [60WETH->40DAI] DAI
    test('givenOut multiple hops', async () => {
        const outputAmount = TokenAmount.fromHumanAmount(DAI, '4142');

        const swap = await sorGetSwapsWithPools(
            BAL,
            DAI,
            SwapKind.GivenOut,
            outputAmount,
            pools,
            swapOptions,
        );

        if (!swap) throw new Error('Swap is undefined');

        const priceImpactSOR = swap.priceImpact;
        const priceImpactRef = PriceImpactAmount.fromDecimal(`${0.0285}`); // TODO: where can we find a reliable source of truth for this?

        expect(priceImpactSOR.decimal).closeTo(priceImpactRef.decimal, 1e-4);
    });
});
