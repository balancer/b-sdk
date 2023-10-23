import { Hex } from 'viem';
import { Token } from '../token';
import { NestedExitCallAttributes } from './types';
import { Relayer } from '../relayer';

export const getPeekCalls = (
    calls: NestedExitCallAttributes[],
    isProportional: boolean,
) => {
    const tokensOut: Token[] = [];
    const peekCalls: Hex[] = [];

    if (isProportional) {
        /**
         * Overall logic: every outputReference that is not being used as input
         * on another call is an output of the multicall and should be peeked.
         */
        calls.forEach((call) => {
            call.outputReferenceKeys.forEach((outputReferenceKey) => {
                // outputReferenceKey is set in a way that its last digit is the token index within the pool, so we can use it to get tokenOut
                const tokenOut =
                    call.sortedTokens[Number(outputReferenceKey % 10n)];
                // check if tokenOut is a pool address of another call - this means that it's an input for that call
                const isTokenBeingUsedAsInput = calls.some(
                    (_call) =>
                        _call.bptAmountIn.isRef === true &&
                        tokenOut.isSameAddress(_call.poolAddress),
                );

                if (!isTokenBeingUsedAsInput) {
                    tokensOut.push(tokenOut);
                    peekCalls.push(
                        Relayer.encodePeekChainedReferenceValue(
                            Relayer.toChainedReference(outputReferenceKey),
                        ),
                    );
                }
            });
        });
    } else {
        // For single token exits, the outputReference of the last call is the only output to be peeked
        const lastCall = calls[calls.length - 1];
        const tokenOut =
            lastCall.sortedTokens[lastCall.tokenOutIndex as number];
        tokensOut.push(tokenOut);
        peekCalls.push(
            Relayer.encodePeekChainedReferenceValue(
                Relayer.toChainedReference(lastCall.outputReferenceKeys[0]),
            ),
        );
    }

    return { peekCalls, tokensOut };
};
