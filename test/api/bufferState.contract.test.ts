import { describe, it, expect } from 'vitest';
import { BalancerApi } from '@/data/providers/balancer-api';
import { API_ENDPOINT, ChainId } from '@/utils';

// Inline constants
const CHAIN_ID = ChainId.MAINNET;
const WRAPPED_ERC4626 = '0x0bfc9d54fc184518a81162f8fb99c2eaca081202';

describe('contract: buffer-state (live API)', () => {
    const api = new BalancerApi(API_ENDPOINT, CHAIN_ID, {
        clientName: 'b-sdk-e2e-tests',
        clientVersion: '0.0.0',
    });

    it('fetches buffer state for ERC4626 token', async () => {
        const state = await api.buffers.fetchBufferState(WRAPPED_ERC4626);
        expect(state.wrappedToken.address).toBeDefined();
        expect(state.underlyingToken.address).toBeDefined();
    });
});


