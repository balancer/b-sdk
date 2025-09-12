import { describe, it, expect } from 'vitest';
import { BalancerApi } from '@/data/providers/balancer-api';
import { API_ENDPOINT, ChainId } from '@/utils';

// Set chain and pool ID here
const CHAIN_ID = ChainId.MAINNET;
const POOL_ID = '0x57c23c58b1d8c3292c15becf07c62c5c52457a42';

describe('contract: pool-state (live API)', () => {
    const api = new BalancerApi(API_ENDPOINT, CHAIN_ID, {
        clientName: 'b-sdk-e2e-tests',
        clientVersion: '0.0.0',
    });

    it('fetches pool state', async () => {
        const pool = await api.pools.fetchPoolState(POOL_ID);
        expect(pool.id).toBeDefined();
        expect(pool.address).toBeDefined();
        expect(pool.tokens.length).toBeGreaterThan(0);
    });

    it('fetches pool state with balances', async () => {
        const pool = await api.pools.fetchPoolStateWithBalances(POOL_ID);
        expect(pool.totalShares).toBeDefined();
        expect(pool.tokens.length).toBeGreaterThan(0);
        expect(pool.tokens[0].balance).toBeDefined();
    });
});


