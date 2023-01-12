import { SmartOrderRouter } from '../src/sor';
import { SubgraphProvider } from '../src/poolProvider';
import { ChainId } from '../src/utils';
import { Token, TokenAmount } from '../src/entities';

BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

export async function test(): Promise<void> {
  const chainId = ChainId.MAINNET;
  const subgraphPoolDataService = new SubgraphProvider(
    chainId,
  );
  const sor = new SmartOrderRouter({ chainId, poolProvider: subgraphPoolDataService });

  const BAL = new Token(chainId, '0xba100000625a3754423978a60c9317c58a424e3D', 18, 'BAL');
  const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');
  const inputAmount = TokenAmount.fromHumanAmount(BAL, '1');

  const swaps = await sor.getSwaps(
    BAL,
    WETH,
    0,
    inputAmount
  );

  console.log(JSON.stringify(swaps));

}

test();
