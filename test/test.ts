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
const SOR_QUERIES = '0x6732d651EeA0bc98FcF4EFF8B62e0CdCB0064f4b';

const chainId = ChainId.MAINNET;
const provider = new JsonRpcProvider(process.env['ETHEREUM_RPC_URL']);
const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);
const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
    process.env['ETHEREUM_RPC_URL']!,
    SOR_QUERIES,
);

const sor = new SmartOrderRouter({
    chainId,
    provider,
    poolDataProviders: subgraphPoolDataService,
    poolDataEnrichers: onChainPoolDataEnricher,
    rpcUrl: process.env['ETHEREUM_RPC_URL']!,
});

const swapOptions: SwapOptions = {
    // block: 16603490,
    block: 16687634,
};

const BAL = new Token(chainId, '0xba100000625a3754423978a60c9317c58a424e3D', 18, 'BAL');
const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');
const USDC = new Token(chainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC');
const USDT = new Token(chainId, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 'USDT');
const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI');

async function getSwaps() {
    const inputAmount = TokenAmount.fromHumanAmount(USDC, '10000');

    const { swap, quote } = await sor.getSwaps(
        WETH,
        USDC,
        SwapKind.GivenOut,
        inputAmount,
        swapOptions,
    );

    swap.paths.forEach(p => p.print());

    const onchain = await swap.query(provider, swapOptions.block);

    // console.log(swap.callData());
    console.log(quote);
    console.log(onchain);
}

getSwaps();
