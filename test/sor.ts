import dotenv from 'dotenv';
dotenv.config();

import { JsonRpcProvider } from '@ethersproject/providers';
import { SmartOrderRouter } from '../src/sor';
import { SubgraphPoolProvider } from '../src/data/providers/subgraphPoolProvider';
import { ChainId, ETH, SUBGRAPH_URLS } from '../src/utils';
import { Token, TokenAmount } from '../src/entities';
import { OnChainPoolDataEnricher } from '../src/data/enrichers/onChainPoolDataEnricher';
import { SwapOptions } from '../src/types';
import { AaveReserveEnricher } from '../src/data/enrichers/aaveReserveEnricher';
import { gql } from 'graphql-request';

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

const SOR_QUERIES = '0x974D3FF709D84Ba44cde3257C0B5B0b14C081Ce9';

// Temp test file before structure for unit tests is set up

export async function testWeightIn(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
    const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        process.env['ETHEREUM_RPC_URL']!,
        SOR_QUERIES,
    );
    const aaveReserveEnricher = new AaveReserveEnricher();

    const sor = new SmartOrderRouter({
        chainId,
        provider,
        poolDataProviders: subgraphPoolDataService,
        poolDataEnrichers: onChainPoolDataEnricher,
    });

    const BAL = new Token(chainId, '0xba100000625a3754423978a60c9317c58a424e3D', 18, 'BAL');
    const inputAmount = TokenAmount.fromHumanAmount(ETH, '1');

    const { swap, quote } = await sor.getSwaps(ETH, BAL, 0, inputAmount);

    const onchain = await swap.query(provider);
    console.log(quote);
    console.log(onchain);
}

export async function testWeightOut(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
    const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        process.env['ETHEREUM_RPC_URL']!,
        SOR_QUERIES,
    );
    const aaveReserveEnricher = new AaveReserveEnricher();

    const sor = new SmartOrderRouter({
        chainId,
        provider,
        poolDataProviders: subgraphPoolDataService,
        poolDataEnrichers: aaveReserveEnricher,
    });

    const BAL = new Token(chainId, '0xba100000625a3754423978a60c9317c58a424e3D', 18, 'BAL');
    const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');
    const outputAmount = TokenAmount.fromHumanAmount(WETH, '1');

    const { swap, quote } = await sor.getSwaps(BAL, WETH, 1, outputAmount);

    const onchain = await swap.query(provider);
    console.log(quote);
    console.log(onchain);
}

export async function testStableIn(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
    const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        process.env['ETHEREUM_RPC_URL']!,
        SOR_QUERIES,
    );
    const aaveReserveEnricher = new AaveReserveEnricher();

    const sor = new SmartOrderRouter({
        chainId,
        provider,
        poolDataProviders: subgraphPoolDataService,
        poolDataEnrichers: onChainPoolDataEnricher,
    });

    const USDC = new Token(chainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC');
    const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI');
    const inputAmount = TokenAmount.fromHumanAmount(USDC, '100');

    const swapOptions: SwapOptions = {
        block: 16516264,
    };

    const { swap, quote } = await sor.getSwaps(USDC, DAI, 0, inputAmount, swapOptions);

    const onchain = await swap.query(provider);
    console.log(quote);
    console.log(onchain);
}

export async function testStableOut(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
    const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        process.env['ETHEREUM_RPC_URL']!,
        SOR_QUERIES,
    );
    const aaveReserveEnricher = new AaveReserveEnricher();

    const sor = new SmartOrderRouter({
        chainId,
        provider,
        poolDataProviders: subgraphPoolDataService,
        poolDataEnrichers: aaveReserveEnricher,
    });

    const USDC = new Token(chainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC');
    const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI');
    const outputAmount = TokenAmount.fromHumanAmount(DAI, '100');

    const { swap, quote } = await sor.getSwaps(USDC, DAI, 1, outputAmount);

    const onchain = await swap.query(provider);
    console.log(quote);
    console.log(onchain);
}

// testWeightIn();
// testWeightOut();
testStableIn();
// testStableOut();
