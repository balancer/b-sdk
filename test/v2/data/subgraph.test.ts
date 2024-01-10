import { SubgraphPoolProvider } from '../../../src/data/providers/subgraphPoolProvider';
import { ProviderSwapOptions } from '../../../src/data/types';
import { ChainId } from '../../../src/utils';

describe(
    'SubgraphPoolProvider',
    () => {
        test('getPools mainnet', async () => {
            const chainId = ChainId.MAINNET;
            const subgraphPoolDataService = new SubgraphPoolProvider(chainId);

            const providerOptions: ProviderSwapOptions = {
                timestamp: BigInt(Math.floor(new Date().getTime() / 1000)),
            };

            const { pools } =
                await subgraphPoolDataService.getPools(providerOptions);
            expect(pools.length).toBeGreaterThan(0);
        });
        test('getPools fantom', async () => {
            const chainId = ChainId.FANTOM;
            const subgraphPoolDataService = new SubgraphPoolProvider(chainId);

            const providerOptions: ProviderSwapOptions = {
                timestamp: BigInt(Math.floor(new Date().getTime() / 1000)),
            };

            const { pools } =
                await subgraphPoolDataService.getPools(providerOptions);
            expect(pools.length).toBeGreaterThan(0);
        });
    },
    {
        timeout: 60000,
    },
);
