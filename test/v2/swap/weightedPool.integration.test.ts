// pnpm test -- swap/weightedPool.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { SmartOrderRouter } from '../../../src/sor';
import { sorGetSwapsWithPools } from '../../../src/static';
import { ChainId, ETH, BATCHSIZE, VAULT } from '../../../src/utils';
import { Token, TokenAmount } from '../../../src/entities';
import { OnChainPoolDataEnricherV2 } from '../../../src/data/enrichers/onChainPoolDataEnricherV2';
import { SwapKind, SwapOptions } from '../../../src/types';
import { BasePool } from '../../../src/entities/pools';
import { MockPoolProvider } from '../../lib/utils/mockPoolProvider';

import testPools from '../../lib/testData/testPools/weighted_17473810.json';
import { RawWeightedPool } from '../../../src';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const BALANCER_VERSION = 2;
const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

describe('Weighted Swap tests', () => {
    const mockPoolProvider = new MockPoolProvider(
        testPools.pools as RawWeightedPool[],
    );
    const onChainPoolDataEnricher = new OnChainPoolDataEnricherV2(
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
        balancerVersion: BALANCER_VERSION,
    });

    const BAL = new Token(
        chainId,
        '0xba100000625a3754423978a60c9317c58a424e3D',
        18,
        'BAL',
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
            BALANCER_VERSION,
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
            BALANCER_VERSION,
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
