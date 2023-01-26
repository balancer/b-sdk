import { SubgraphPoolProvider } from '../src/data/providers/subgraphPoolProvider';
import { ChainId } from '../src/utils';

export async function test(): Promise<void> {
    const chainId = ChainId.MAINNET;
    const subgraphPoolDataService = new SubgraphPoolProvider(chainId);

    console.time();
    await subgraphPoolDataService.getPools();
    console.timeEnd();
}

test();
