// pnpm test -- inferUnwrapWrapped.test.ts
//
// Unit tests for the inferUnwrapWrapped helper (no fork required).

import { describe, it, expect } from 'vitest';
import { inferUnwrapWrapped } from '@/entities/removeLiquidityBoosted/inferUnwrapWrapped';

// Pool token addresses used across tests
const PLAIN_TOKEN = '0xb58e61c3098d85632df34eecfb899a1ed80921cb'; // ZCHF
const ERC4626_TOKEN = '0xe5f130253ff137f9917c0107659a4c5262abf6b0'; // svZCHF (underlying = ZCHF)
const OTHER_TOKEN = '0x1111111111111111111111111111111111111111';

// Minimal PoolStateWithUnderlyings representing ZCHF + svZCHF.
// Token[0] is a plain token; token[1] is ERC4626 whose underlying shares the
// same address as token[0] — the duplicate-address scenario that broke the
// flat-map inference.
const duplicateAddressPool = {
    id: '0x849d43118c2e3c4856af26ee96f1a9d72bc2774f',
    address: '0x849d43118c2e3c4856af26ee96f1a9d72bc2774f' as `0x${string}`,
    type: 'Stable',
    protocolVersion: 3 as const,
    tokens: [
        {
            index: 0,
            address: PLAIN_TOKEN as `0x${string}`,
            decimals: 18,
            underlyingToken: null,
        },
        {
            index: 1,
            address: ERC4626_TOKEN as `0x${string}`,
            decimals: 18,
            underlyingToken: {
                address: PLAIN_TOKEN as `0x${string}`,
                decimals: 18,
                index: 1,
            },
        },
    ],
};

// Standard two-token boosted pool: plain token A, ERC4626 token B with
// a distinct underlying.
const PLAIN_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
const ERC4626_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
const UNDERLYING_B =
    '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;

const standardPool = {
    tokens: [
        { index: 0, address: PLAIN_A, decimals: 6, underlyingToken: null },
        {
            index: 1,
            address: ERC4626_B,
            decimals: 18,
            underlyingToken: { address: UNDERLYING_B, decimals: 6, index: 1 },
        },
    ],
};

describe('inferUnwrapWrapped', () => {
    describe('duplicate-address pool (ZCHF + svZCHF)', () => {
        it('returns [false, true] when tokensOut = [PLAIN_TOKEN, PLAIN_TOKEN] — slot 0 keeps pool token, slot 1 unwraps ERC4626 to underlying', () => {
            const result = inferUnwrapWrapped(duplicateAddressPool.tokens, [
                PLAIN_TOKEN as `0x${string}`,
                PLAIN_TOKEN as `0x${string}`,
            ]);
            expect(result).toEqual([false, true]);
        });

        it('returns [false, false] when tokensOut = [PLAIN_TOKEN, ERC4626_TOKEN] — both legs keep pool tokens', () => {
            const result = inferUnwrapWrapped(duplicateAddressPool.tokens, [
                PLAIN_TOKEN as `0x${string}`,
                ERC4626_TOKEN as `0x${string}`,
            ]);
            expect(result).toEqual([false, false]);
        });
    });

    describe('standard (non-duplicate) pool', () => {
        it('returns [true, true] when both tokensOut are underlying addresses', () => {
            const result = inferUnwrapWrapped(standardPool.tokens, [
                PLAIN_A, // PLAIN_A has no underlying; matching its own address = false
                UNDERLYING_B,
            ]);
            expect(result).toEqual([false, true]);
        });

        it('returns [false, false] when both tokensOut are pool token addresses', () => {
            const result = inferUnwrapWrapped(standardPool.tokens, [
                PLAIN_A,
                ERC4626_B,
            ]);
            expect(result).toEqual([false, false]);
        });

        it('returns [false, true] for a partial-boosted pool when slot 0 wants plain token and slot 1 wants underlying', () => {
            const result = inferUnwrapWrapped(standardPool.tokens, [
                PLAIN_A,
                UNDERLYING_B,
            ]);
            expect(result).toEqual([false, true]);
        });
    });

    describe('validation', () => {
        it('throws a validation error when tokensOut[i] is neither the pool token address nor its underlying address', () => {
            expect(() =>
                inferUnwrapWrapped(duplicateAddressPool.tokens, [
                    PLAIN_TOKEN as `0x${string}`,
                    OTHER_TOKEN as `0x${string}`,
                ]),
            ).toThrow(/tokensOut\[1\]/);
        });

        it('throws referencing the correct pool token index in the error message', () => {
            expect(() =>
                inferUnwrapWrapped(standardPool.tokens, [
                    OTHER_TOKEN as `0x${string}`,
                    ERC4626_B,
                ]),
            ).toThrow(/tokensOut\[0\]/);
        });
    });

    describe('address comparison', () => {
        it('matches addresses case-insensitively (mixed-case checksummed vs lowercased)', () => {
            const mixedCasePlain = PLAIN_TOKEN.toLowerCase() as `0x${string}`;
            const mixedCaseERC4626 = ERC4626_TOKEN.toUpperCase().replace(
                /^0X/,
                '0x',
            ) as `0x${string}`;

            const result = inferUnwrapWrapped(duplicateAddressPool.tokens, [
                mixedCasePlain,
                mixedCaseERC4626,
            ]);
            expect(result).toEqual([false, false]);
        });
    });
});
