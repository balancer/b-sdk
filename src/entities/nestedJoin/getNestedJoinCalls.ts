import { Token } from '../token';
import { getPoolAddress } from '../../utils';
import { NestedJoinInput, NestedPoolState, NestedJoinCall } from './types';

export function getNestedJoinCalls(
    input: NestedJoinInput,
    nestedPoolState: NestedPoolState,
) {
    /**
     * Overall logic to build sequence of join calls:
     * 1. Go from bottom pool to up filling out input amounts and output refs
     * 2. Inputs will be amountsIn provided, output of the previous level or 0n
     * 3. Output at max level is the bptOut
     */

    const poolsSortedByLevel = nestedPoolState.pools.sort(
        (a, b) => a.level - b.level,
    );

    const calls: NestedJoinCall[] = [];
    for (const pool of poolsSortedByLevel) {
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(input.chainId, t.address, t.decimals));
        calls.push({
            chainId: input.chainId,
            useNativeAssetAsWrappedAmountIn:
                input.useNativeAssetAsWrappedAmountIn ?? false,
            sortedTokens,
            poolId: pool.id,
            poolType: pool.type,
            kind: 0,
            sender: input.testAddress,
            recipient: input.testAddress,
            maxAmountsIn: sortedTokens.map((token) => {
                const amountIn = input.amountsIn.find((a) =>
                    token.isSameAddress(a.address),
                );
                const lowerLevelCall = calls.find(
                    (call) => getPoolAddress(call.poolId) === token.address,
                );
                if (amountIn) {
                    return {
                        amount: amountIn.rawAmount,
                        isRef: false,
                    };
                } else if (lowerLevelCall !== undefined) {
                    return {
                        amount: lowerLevelCall.outputReferenceKey,
                        isRef: true,
                    };
                } else {
                    return {
                        amount: 0n,
                        isRef: false,
                    };
                }
            }),
            minBptOut: 0n,
            fromInternalBalance: input.fromInternalBalance ?? false,
            outputReferenceKey: BigInt(poolsSortedByLevel.indexOf(pool)) + 100n,
        });
    }
    return calls;
}
