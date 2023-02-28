import { SubgraphPoolProvider } from '../src/data/providers/subgraphPoolProvider';
import { ChainId, SUBGRAPH_URLS } from '../src/utils';
import { ProviderSwapOptions } from '../src/data/types';

describe('SubgraphPoolProvider', () => {
    test('getPools mainnet', async () => {
        const chainId = ChainId.MAINNET;
        const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);

        const providerOptions: ProviderSwapOptions = {
            timestamp: Math.floor(new Date().getTime() / 1000),
        };

        const { pools } = await subgraphPoolDataService.getPools(providerOptions);
        expect(pools.length).toBeGreaterThan(0);
    });
});
