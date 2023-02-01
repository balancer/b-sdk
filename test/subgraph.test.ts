import { SubgraphPoolProvider } from '../src/data/providers/subgraphPoolProvider';
import { ChainId, SUBGRAPH_URLS } from '../src/utils';

describe('SubgraphPoolProvider', () => {
    test('getPools mainnet', async () => {
        const chainId = ChainId.MAINNET;
        const subgraphPoolDataService = new SubgraphPoolProvider(SUBGRAPH_URLS[chainId]);

        const { pools } = await subgraphPoolDataService.getPools();
        expect(pools.length).toBeGreaterThan(0);
        pools.forEach(pool => {
            expect(Number(pool.totalShares)).toBeGreaterThan(0);
        });
    });
});
