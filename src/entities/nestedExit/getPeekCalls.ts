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
            call.outputReferences.forEach((outputReference) => {
                const tokenOut =
                    call.sortedTokens[Number(outputReference.index)];
                // check if tokenOut is a pool address of another call - this means that it's an input for that call
                const isTokenBeingUsedAsInput = calls.some((_call) =>
                    tokenOut.isSameAddress(_call.poolAddress),
                );

                if (!isTokenBeingUsedAsInput) {
                    tokensOut.push(tokenOut);
                    peekCalls.push(
                        Relayer.encodePeekChainedReferenceValue(
                            outputReference.key,
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
                lastCall.outputReferences[0].key,
            ),
        );
    }

    return { peekCalls, tokensOut };
};
