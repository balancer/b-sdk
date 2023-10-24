import { Token } from '../token';
import { getPoolAddress } from '../../utils';
import { NestedJoinInput, NestedJoinCallAttributes } from './types';
import { NestedPoolState, PoolKind } from '../types';

export const getQueryCallsAttributes = (
    {
        amountsIn,
        chainId,
        accountAddress,
        useNativeAssetAsWrappedAmountIn,
        fromInternalBalance,
    }: NestedJoinInput,
    { pools }: NestedPoolState,
): NestedJoinCallAttributes[] => {
    /**
     * Overall logic to build sequence of join calls:
     * 1. Go from bottom pool to up filling out input amounts and output refs
     * 2. Inputs will be amountsIn provided, output of the previous level or 0n
     * 3. Output at max level is the bptOut
     */

    const poolsSortedByLevel = pools.sort((a, b) => a.level - b.level);

    const calls: NestedJoinCallAttributes[] = [];
    for (const pool of poolsSortedByLevel) {
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));
        calls.push({
            chainId: chainId,
            useNativeAssetAsWrappedAmountIn:
                useNativeAssetAsWrappedAmountIn ?? false,
            sortedTokens,
            poolId: pool.id,
            poolAddress: pool.address,
            poolType: pool.type,
            kind:
                pool.type === 'ComposableStable'
                    ? PoolKind.COMPOSABLE_STABLE_V2
                    : PoolKind.WEIGHTED,
            sender: accountAddress,
            recipient: accountAddress,
            maxAmountsIn: sortedTokens.map((token) => {
                /**
                 * There are 3 possible scenarios:
                 * 1. token has amountIn provided by the user -> return amount
                 * 2. token is the output of a previous join call -> return outputRef
                 * 3. otherwise -> return zero
                 */

                // 1. token has amountIn provided by the user -> return amount
                const amountIn = amountsIn.find((a) =>
                    token.isSameAddress(a.address),
                );
                if (amountIn !== undefined) {
                    return {
                        amount: amountIn.rawAmount,
                        isRef: false,
                    };
                }

                // 2. token is the output of a previous join call -> return outputRef
                const previousJoinCall = calls.find(
                    (call) => getPoolAddress(call.poolId) === token.address,
                );
                if (previousJoinCall !== undefined) {
                    return {
                        amount: previousJoinCall.outputReferenceKey,
                        isRef: true,
                    };
                }

                // 3. otherwise -> return zero
                return {
                    amount: 0n,
                    isRef: false,
                };
            }),
            minBptOut: 0n, // limits set to zero for query calls
            fromInternalBalance: fromInternalBalance ?? false,
            outputReferenceKey: BigInt(poolsSortedByLevel.indexOf(pool)),
        });
    }
    return calls;
};
