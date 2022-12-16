import { SubgraphProvider } from '../src/poolProvider';
import { ChainId } from '../src/utils';

export async function test(): Promise<void> {
  const chainId = ChainId.MAINNET;
  const subgraphPoolDataService = new SubgraphProvider(
    chainId,
  );

  console.time();
  await subgraphPoolDataService.getPools();
  console.timeEnd();

}

test();
