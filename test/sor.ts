import { JsonRpcProvider } from '@ethersproject/providers';
import { SmartOrderRouter } from '../src/sor';
import { SubgraphProvider } from '../src/poolProvider';
import { ChainId, DEFAULT_FUND_MANAGMENT } from '../src/utils';
import { Token, TokenAmount } from '../src/entities';
import { SwapKind } from '../src/types';
import { Contract } from '@ethersproject/contracts';
import vaultAbi from '../src/abi/Vault.json';

BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

export async function test(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const subgraphPoolDataService = new SubgraphProvider(chainId);
    const provider = new JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const sor = new SmartOrderRouter({ chainId, provider, poolProvider: subgraphPoolDataService });

    const block = 16415500;
    const BAL = new Token(chainId, '0xba100000625a3754423978a60c9317c58a424e3D', 18, 'BAL');
    const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');
    const inputAmount = TokenAmount.fromHumanAmount(BAL, '1');

    const { swap } = await sor.getSwaps(BAL, WETH, 0, inputAmount, {
        block,
    });

    const vault = new Contract(`0xBA12222222228d8Ba445958a75a0704d566BF2C8`, vaultAbi, provider);

    const deltas = await vault.callStatic.queryBatchSwap(
        SwapKind.GivenIn,
        swap.swaps,
        swap.assets,
        DEFAULT_FUND_MANAGMENT,
        {
            blockTag: block,
        },
    );

    console.log(JSON.stringify(swap.assets));
    deltas.forEach(d => {
        console.log(d.toString());
    });

    console.log(JSON.stringify(swap));
}

test();
