// pnpm test -- test/data/subgraph.test.ts
import { SubgraphPoolProviderV2 } from '../../src/data/providers/subgraphPoolProviderV2';
import { ChainId } from '../../src/utils';
import { ProviderSwapOptions } from '../../src/data/types';

describe(
    'SubgraphPoolProviderV2',
    () => {
        test('getPools mainnet', async () => {
            const chainId = ChainId.MAINNET;
            const subgraphPoolDataService = new SubgraphPoolProviderV2(chainId);

            const providerOptions: ProviderSwapOptions = {
                timestamp: BigInt(Math.floor(new Date().getTime() / 1000)),
            };

            const { pools } = await subgraphPoolDataService.getPools(
                providerOptions,
            );
            expect(pools.length).toBeGreaterThan(0);
        });
        test('getPools fantom', async () => {
            const chainId = ChainId.FANTOM;
            const subgraphPoolDataService = new SubgraphPoolProviderV2(chainId);

            const providerOptions: ProviderSwapOptions = {
                timestamp: BigInt(Math.floor(new Date().getTime() / 1000)),
            };

            const { pools } = await subgraphPoolDataService.getPools(
                providerOptions,
            );
            expect(pools.length).toBeGreaterThan(0);
        });
    },
    {
        timeout: 60000,
    },
);

// TODO V3: Add test
