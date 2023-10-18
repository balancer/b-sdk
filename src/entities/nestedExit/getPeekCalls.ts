import { Hex } from 'viem';
import { Token } from '../token';
import { NestedExitCall } from './types';
import { Relayer } from '../relayer';
import { getPoolAddress } from '../../utils';

export const getPeekCalls = (calls: NestedExitCall[]) => {
    const tokensOut: Token[] = [];
    const peekCalls: Hex[] = [];

    const isSingleTokenExit =
        calls[calls.length - 1].tokenOutIndex !== undefined;
    if (isSingleTokenExit) {
        const lastCall = calls[calls.length - 1];
        const tokenOut =
            lastCall.sortedTokens[lastCall.tokenOutIndex as number];
        tokensOut.push(tokenOut);
        peekCalls.push(
            Relayer.encodePeekChainedReferenceValue(
                Relayer.toChainedReference(
                    lastCall.outputReferenceKeys[0],
                    false,
                ),
            ),
        );
    } else {
        calls.forEach((call) => {
            call.outputReferenceKeys.forEach((opRefKey) => {
                const tokenOut = call.sortedTokens[Number(opRefKey % 10n)];
                const isTokenBeingUsedAsInput = calls.some(
                    (_call) =>
                        _call.bptAmountIn.isRef === true &&
                        tokenOut.isSameAddress(getPoolAddress(_call.poolId)),
                );

                if (!isTokenBeingUsedAsInput) {
                    tokensOut.push(tokenOut);
                    peekCalls.push(
                        Relayer.encodePeekChainedReferenceValue(
                            Relayer.toChainedReference(opRefKey, false),
                        ),
                    );
                }
            });
        });
    }

    return { peekCalls, tokensOut };
};
