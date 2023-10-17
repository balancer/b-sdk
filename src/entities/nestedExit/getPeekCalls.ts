import { Hex } from 'viem';
import { Token } from '../token';
import { NestedExitCall } from './types';
import { Relayer } from '../relayer';
import { getPoolAddress } from '../../utils';

export const getPeekCalls = (calls: NestedExitCall[]) => {
    const tokensOut: Token[] = [];
    const peekCalls: Hex[] = [];
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
    return { peekCalls, tokensOut };
};
