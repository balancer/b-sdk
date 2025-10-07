import { Hex } from 'viem';
import { RemoveLiquidityNestedCallAttributesV2 } from './types';
import { BaseToken } from '@/entities/baseToken';
import { Relayer } from '@/entities/relayer';

export const getPeekCalls = (
    calls: RemoveLiquidityNestedCallAttributesV2[],
    isProportional: boolean,
) => {
    const tokensOut: BaseToken[] = [];
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
                    const readOnlyChainedReference = Relayer.toChainedReference(
                        Relayer.fromChainedReference(outputReference.key),
                        false,
                    );
                    peekCalls.push(
                        Relayer.encodePeekChainedReferenceValue(
                            readOnlyChainedReference,
                        ),
                    );
                }
            });
        });
    } else {
        // For removing liquidity to single token, the outputReference of the last call is the only output to be peeked
        const lastCall = calls[calls.length - 1];
        const tokenOut =
            lastCall.sortedTokens[lastCall.tokenOutIndex as number];
        tokensOut.push(tokenOut);
        const readOnlyChainedReference = Relayer.toChainedReference(
            Relayer.fromChainedReference(lastCall.outputReferences[0].key),
            false,
        );
        peekCalls.push(
            Relayer.encodePeekChainedReferenceValue(readOnlyChainedReference),
        );
    }

    return { peekCalls, tokensOut };
};
