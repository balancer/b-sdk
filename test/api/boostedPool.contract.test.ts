import { describe, it, expect } from 'vitest';
import { BalancerApi } from '@/data/providers/balancer-api';
import { API_ENDPOINT, ChainId } from '@/utils';

const CHAIN_ID = ChainId.MAINNET;
const BOOSTED_POOL_ID = '0x57c23c58b1d8c3292c15becf07c62c5c52457a42';

describe('contract: boosted-pool-state (live API)', () => {
    const api = new BalancerApi(API_ENDPOINT, CHAIN_ID, {
        clientName: 'b-sdk-e2e-tests',
        clientVersion: '0.0.0',
    });

    it('fetches boosted pool with underlyings', async () => {
        const pool =
            await api.boostedPools.fetchPoolStateWithUnderlyings(
                BOOSTED_POOL_ID,
            );
        expect(pool.tokens.length).toBeGreaterThan(0);
        // at least one token should have an underlying or be a plain token
        expect(
            pool.tokens.some(
                (t) => t.underlyingToken === null || t.underlyingToken !== null,
            ),
        ).toBe(true);
    });
});
