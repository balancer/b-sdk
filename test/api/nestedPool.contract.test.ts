import { describe, it, expect } from 'vitest';
import { BalancerApi } from '@/data/providers/balancer-api';
import { API_ENDPOINT, ChainId } from '@/utils';

const CHAIN_ID = ChainId.MAINNET;
const NESTED_POOL_ID =
    '0x4cbde5c4b4b53ebe4af4adb85404725985406163000000000000000000000595';

describe('contract: nested-pool-state (live API)', () => {
    const api = new BalancerApi(API_ENDPOINT, CHAIN_ID, {
        clientName: 'b-sdk-e2e-tests',
        clientVersion: '0.0.0',
    });

    it('fetches nested pool state', async () => {
        const state = await api.nestedPools.fetchNestedPoolState(
            NESTED_POOL_ID!,
        );
        expect(state.pools.length).toBeGreaterThan(0);
        expect(state.mainTokens.length).toBeGreaterThan(0);
    });
});
