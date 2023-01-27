import dotenv from 'dotenv';
dotenv.config();

import { JsonRpcProvider } from '@ethersproject/providers';
import { SmartOrderRouter } from '../src/sor';
import { SubgraphPoolProvider } from '../src/data/providers/subgraphPoolProvider';
import { ChainId, SUBGRAPH_URLS } from '../src/utils';
import { Token, TokenAmount } from '../src/entities';
import { OnChainPoolDataEnricher } from '../src/data/enrichers/onChainPoolDataEnricher';
import { SwapOptions } from '../src/types';
import { AaveReserveEnricher } from '../src/data/enrichers/aaveReserveEnricher';

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

const VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const SOR_QUERIES = '0x40f7218fa50ead995c4343eB0bB46dD414F9da7A';

// Temp test file before structure for unit tests is set up

export async function testWeightIn(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
    const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        VAULT,
        SOR_QUERIES,
        process.env['ETHEREUM_RPC_URL']!,
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
    const inputAmount = TokenAmount.fromHumanAmount(BAL, '1');

    const { swap, quote } = await sor.getSwaps(BAL, WETH, 0, inputAmount);

    const onchain = await swap.query(provider);
    console.log(quote);
    console.log(onchain);
}

export async function testWeightOut(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
    const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        VAULT,
        SOR_QUERIES,
        process.env['ETHEREUM_RPC_URL']!,
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
        VAULT,
        SOR_QUERIES,
        process.env['ETHEREUM_RPC_URL']!,
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
    const inputAmount = TokenAmount.fromHumanAmount(USDC, '100');

    const swapOptions: SwapOptions = {
        block: 16443618,
    };

    const { swap, quote } = await sor.getSwaps(USDC, DAI, 0, inputAmount, swapOptions);

    const onchain = await swap.query(provider, swapOptions.block);
    console.log(quote);
    console.log(onchain);
}

export async function testStableOut(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
    const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        VAULT,
        SOR_QUERIES,
        process.env['ETHEREUM_RPC_URL']!,
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

    const swapOptions: SwapOptions = {
        block: 16443618,
    };

    const { swap, quote } = await sor.getSwaps(USDC, DAI, 1, outputAmount, swapOptions);

    const onchain = await swap.query(provider, swapOptions.block);
    console.log(quote);
    console.log(onchain);
}

testWeightIn();
testWeightOut();
testStableIn();
testStableOut();
