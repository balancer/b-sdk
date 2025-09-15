import { describe, it, expect } from 'vitest';
import { BalancerApi } from '@/data/providers/balancer-api';
import { API_ENDPOINT, ChainId } from '@/utils';
import { Address } from 'viem';
import { Token, TokenAmount } from '@/entities';
import { SwapKind } from '@/types';

// Inline minimal constants
const CHAIN_ID = ChainId.MAINNET;
const TOKEN_IN = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address; // WETH
const TOKEN_OUT = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address; // USDC

describe('contract: sor swap paths (live API)', () => {
    const api = new BalancerApi(API_ENDPOINT, CHAIN_ID, {
        clientName: 'b-sdk-e2e-tests',
        clientVersion: '0.0.0',
    });

    it('fetches SOR swap paths', async () => {
        const token = new Token(CHAIN_ID, TOKEN_IN, 18);
        const oneUnit = TokenAmount.fromHumanAmount(token, '0.001');
        const paths = await api.sorSwapPaths.fetchSorSwapPaths({
            chainId: CHAIN_ID,
            tokenIn: TOKEN_IN,
            tokenOut: TOKEN_OUT,
            swapKind: SwapKind.GivenIn,
            swapAmount: oneUnit,
        });
        expect(Array.isArray(paths)).toBe(true);
    });

    it('fetches SOR swap paths with protocol version', async () => {
        const token = new Token(CHAIN_ID, TOKEN_IN, 18);
        const oneUnit = TokenAmount.fromHumanAmount(token, '0.001');
        const paths = await api.sorSwapPaths.fetchSorSwapPaths({
            chainId: CHAIN_ID,
            tokenIn: TOKEN_IN,
            tokenOut: TOKEN_OUT,
            swapKind: SwapKind.GivenIn,
            swapAmount: oneUnit,
            useProtocolVersion: 3, // Test the versioned query
        });
        expect(Array.isArray(paths)).toBe(true);
    });
});


