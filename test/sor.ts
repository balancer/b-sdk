import { Sor } from '../src/sor';
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
  const sor = new Sor({ chainId, poolProvider: subgraphPoolDataService })

  const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI');
  const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH');
  const inputAmount = TokenAmount.fromHumanAmount(DAI, '1');

  console.time();
  const swaps = await sor.getSwaps(
    DAI,
    WETH,
    0,
    inputAmount
  );
  console.timeEnd();

  // console.log(JSON.stringify(swaps))

}

test();
