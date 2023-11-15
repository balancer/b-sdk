// pnpm test -- test/data/balancerApi.test.ts
import { BalancerApi, PoolStateInput, ChainId } from '../../src';

describe(
    'BalancerApi Provider',
    () => {
        test('CS Pool - Should add BPT to tokens', async () => {
            const chainId = ChainId.MAINNET;
            // wstEth/WETH CS Pool
            const poolId =
                '0x93d199263632a4ef4bb438f1feb99e57b4b5f0bd0000000000000000000005c2';

            // API is used to fetch relevant pool data
            const balancerApi = new BalancerApi(
                'https://backend-v3-canary.beets-ftm-node.com/graphql',
                chainId,
            );
            const poolStateInput: PoolStateInput =
                await balancerApi.pools.fetchPoolState(poolId);

            expect(poolStateInput.tokens.length).toEqual(3);
            expect(poolStateInput.tokens[1].address).toEqual(
                poolStateInput.address,
            );
        });
    },
    {
        timeout: 60000,
    },
);
