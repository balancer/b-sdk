import { Token } from '../token';
import { NestedExitInput, NestedExitCall } from './types';
import { NestedPoolState } from '../types';
import { TokenAmount } from '../tokenAmount';

export const getNestedExitCalls = (
    {
        bptAmountIn,
        chainId,
        accountAddress,
        useNativeAssetAsWrappedAmountOut = false,
        toInternalBalance = false,
    }: NestedExitInput,
    { pools }: NestedPoolState,
): { bptAmountIn: TokenAmount; calls: NestedExitCall[] } => {
    /**
     * Overall logic to build sequence of join calls:
     * 1. Go from top pool to bottom filling out input amounts and output refs
     * 2. Inputs will be bptAmountIn provided or output of the previous level
     * 3. Output at bottom level is the amountsOut
     */

    // sort pools by descending level
    const poolsSortedByLevel = pools.sort((a, b) => b.level - a.level);

    const calls: NestedExitCall[] = [];
    for (const pool of poolsSortedByLevel) {
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));

        // const sortedTokensWithoutBpt = sortedTokens.filter(
        //     (t) => !t.isSameAddress(pool.address),
        // );

        const upperLevelCall = calls.find((call) =>
            call.sortedTokens
                .map((token) => token.address)
                .includes(pool.address),
        );
        calls.push({
            chainId: chainId,
            useNativeAssetAsWrappedAmountOut,
            sortedTokens,
            poolId: pool.id,
            poolType: pool.type,
            kind: pool.type === 'ComposableStable' ? 3 : 0, // enum PoolKind { WEIGHTED, LEGACY_STABLE, COMPOSABLE_STABLE, COMPOSABLE_STABLE_V2 }
            sender: accountAddress,
            recipient: accountAddress,
            bptAmountIn:
                upperLevelCall === undefined
                    ? {
                          amount: bptAmountIn,
                          isRef: false,
                      }
                    : {
                          amount: upperLevelCall.outputReferenceKeys[
                              upperLevelCall.sortedTokens
                                  .map((token) => token.address)
                                  .indexOf(pool.address)
                          ],
                          isRef: true,
                      },
            minAmountsOut: Array(sortedTokens.length).fill(0n),
            toInternalBalance,
            // TODO: previous implementation of nested exit didn't add an outputReferenceKey for the BPT token,
            // but if I remove it from here, peek logic fails. Need to investigate why.
            // Once we figure this out, we should be able to replace sortedTokens by sortedTokensWithoutBpt
            outputReferenceKeys: sortedTokens.map(
                (token) =>
                    100n +
                    BigInt(poolsSortedByLevel.indexOf(pool)) * 10n +
                    BigInt(sortedTokens.indexOf(token)),
            ),
        });
    }

    const bptIn = new Token(chainId, poolsSortedByLevel[0].address, 18);
    const _bptAmountIn = TokenAmount.fromRawAmount(bptIn, bptAmountIn);
    return { calls, bptAmountIn: _bptAmountIn };
};
