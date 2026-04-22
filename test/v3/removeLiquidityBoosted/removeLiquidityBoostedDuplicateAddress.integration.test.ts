// pnpm test test/v3/removeLiquidityBoosted/removeLiquidityBoostedDuplicateAddress.integration.test.ts
//
// Regression test for the duplicate-address tokensOut bug.
//
// The ZCHF + svZCHF pool on Mainnet has:
//   token[0] = ZCHF (plain, no underlying)
//   token[1] = svZCHF (ERC4626, underlying = ZCHF — same address as token[0])
//
// When a caller passes tokensOut = [ZCHF, ZCHF] the old flat-map inference
// overwrites the plain-token entry with the underlying entry, producing
// unwrapWrapped = [true, true]. That causes a BufferNotInitialized revert
// because ZCHF at slot 0 has no ERC4626 buffer.
//
// EXPECTED STATUS:
//   FAIL before the inference fix (todo: wire-query) — query reverts
//   PASS after the fix — unwrapWrapped = [false, true], correct amountsOut

import { config } from 'dotenv';
config();

import { RemoveLiquidityKind, RemoveLiquidityBoostedV3 } from 'src';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { boostedPool_ZCHF_svZCHF } from 'test/mockData/boostedPool';
import type { RemoveLiquidityBoostedProportionalInput } from 'src';

// Mainnet addresses
const ZCHF_ADDRESS = '0xb58e61c3098d85632df34eecfb899a1ed80921cb';
const SVZCHF_ADDRESS = '0xe5f130253ff137f9917c0107659a4c5262abf6b0';

// Fork block at which the ZCHF + svZCHF pool exists and has liquidity.
// Must be pinned so the test is deterministic — do not use the MAINNET default.
const FORK_BLOCK = 24935946n;

describe('RemoveLiquidityBoostedV3 — duplicate tokensOut address (ZCHF + svZCHF)', () => {
    let rpcUrl: string;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.MAINNET,
            undefined,
            FORK_BLOCK,
        ));
    });

    test('query with tokensOut = [ZCHF, ZCHF] resolves unwrapWrapped = [false, true]', async () => {
        const removeLiquidity = new RemoveLiquidityBoostedV3();

        const input: RemoveLiquidityBoostedProportionalInput = {
            chainId: 1,
            rpcUrl,
            bptIn: {
                address: boostedPool_ZCHF_svZCHF.address,
                decimals: 18,
                rawAmount: 1_000_000_000_000_000_000n, // 1 BPT — query only, no balance required
            },
            // Both entries are the ZCHF address: slot 0 should stay unwrapped
            // (it IS the pool token), slot 1 should unwrap (it is the underlying
            // of svZCHF). This is the case the flat-map inference gets wrong.
            tokensOut: [ZCHF_ADDRESS, ZCHF_ADDRESS],
            kind: RemoveLiquidityKind.Proportional,
        };

        const queryOutput = await removeLiquidity.query(
            input,
            boostedPool_ZCHF_svZCHF,
        );

        // Per-index unwrap flags must be correct
        expect(queryOutput.unwrapWrapped).toEqual([false, true]);

        // amountsOut must have one entry per pool token
        expect(queryOutput.amountsOut).toHaveLength(
            boostedPool_ZCHF_svZCHF.tokens.length,
        );

        // Both output token addresses are ZCHF (the plain token at slot 0 and
        // the underlying of svZCHF at slot 1 share the same address)
        expect(queryOutput.amountsOut[0].token.address.toLowerCase()).toEqual(
            ZCHF_ADDRESS.toLowerCase(),
        );
        expect(queryOutput.amountsOut[1].token.address.toLowerCase()).toEqual(
            ZCHF_ADDRESS.toLowerCase(),
        );

        // Amounts must be positive — the pool has real liquidity at this block
        expect(queryOutput.amountsOut[0].amount).toBeGreaterThan(0n);
        expect(queryOutput.amountsOut[1].amount).toBeGreaterThan(0n);
    });

    test('query with tokensOut = [ZCHF, svZCHF] resolves unwrapWrapped = [false, false] (no unwrap on either leg)', async () => {
        const removeLiquidity = new RemoveLiquidityBoostedV3();

        const input: RemoveLiquidityBoostedProportionalInput = {
            chainId: 1,
            rpcUrl,
            bptIn: {
                address: boostedPool_ZCHF_svZCHF.address,
                decimals: 18,
                rawAmount: 1_000_000_000_000_000_000n,
            },
            tokensOut: [ZCHF_ADDRESS, SVZCHF_ADDRESS],
            kind: RemoveLiquidityKind.Proportional,
        };

        const queryOutput = await removeLiquidity.query(
            input,
            boostedPool_ZCHF_svZCHF,
        );

        expect(queryOutput.unwrapWrapped).toEqual([false, false]);
        expect(queryOutput.amountsOut).toHaveLength(
            boostedPool_ZCHF_svZCHF.tokens.length,
        );
        expect(queryOutput.amountsOut[0].token.address.toLowerCase()).toEqual(
            ZCHF_ADDRESS.toLowerCase(),
        );
        expect(queryOutput.amountsOut[1].token.address.toLowerCase()).toEqual(
            SVZCHF_ADDRESS.toLowerCase(),
        );
    });
});
