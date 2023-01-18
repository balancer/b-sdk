import { JsonRpcProvider } from '@ethersproject/providers';
import { SmartOrderRouter } from '../src/sor';
import { SubgraphProvider } from '../src/poolProvider';
import { ChainId } from '../src/utils';
import { Token, TokenAmount } from '../src/entities';

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

export async function testWeight(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const subgraphPoolDataService = new SubgraphProvider(chainId);
    const provider = new JsonRpcProvider(process.env["ETHEREUM_RPC_URL"]);
    const sor = new SmartOrderRouter({ chainId, provider, poolProvider: subgraphPoolDataService });

    const BAL = new Token(chainId, '0xba100000625a3754423978a60c9317c58a424e3D', 18, 'BAL');
    const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');
    const inputAmount = TokenAmount.fromHumanAmount(BAL, '1');

    const { swap, quote } = await sor.getSwaps(BAL, WETH, 0, inputAmount);

    const onchain = await swap.query(provider);
    console.log(quote);
    console.log(onchain);
}

export async function testStable(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const subgraphPoolDataService = new SubgraphProvider(chainId);
    const provider = new JsonRpcProvider(process.env["ETHEREUM_RPC_URL"]);
    const sor = new SmartOrderRouter({ chainId, provider, poolProvider: subgraphPoolDataService });

    const USDC = new Token(chainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC');
    const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI');
    const inputAmount = TokenAmount.fromHumanAmount(USDC, '100');

    const { swap, quote } = await sor.getSwaps(USDC, DAI, 0, inputAmount);

    const onchain = await swap.query(provider);
    console.log(quote);
    console.log(onchain);
}

// testWeight();
testStable();