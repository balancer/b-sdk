import { Hex } from '../../types';
import { WeightedEncoder } from '../encoders';
import { ComposableStableEncoder } from '../encoders/composableStable';
import { NestedExitCall } from './types';
import { Relayer } from '../relayer';
import { replaceWrapped } from '../utils/replaceWrapped';

export const parseNestedExitCall = ({
    useNativeAssetAsWrappedAmountOut,
    chainId,
    sortedTokens,
    poolId,
    poolType,
    kind,
    sender,
    recipient,
    bptAmountIn,
    minAmountsOut,
    toInternalBalance,
    outputReferenceKeys,
}: NestedExitCall) => {
    // replace wrapped token with native asset if needed
    let tokensOut = [...sortedTokens];
    if (chainId && useNativeAssetAsWrappedAmountOut) {
        tokensOut = replaceWrapped([...sortedTokens], chainId);
    }

    const _bptAmountIn = bptAmountIn.isRef
        ? Relayer.toChainedReference(bptAmountIn.amount)
        : bptAmountIn.amount;

    let userData: Hex;
    switch (poolType) {
        case 'Weighted':
            userData = WeightedEncoder.exitProportional(_bptAmountIn);
            break;
        case 'ComposableStable':
            userData = ComposableStableEncoder.exitProportional(_bptAmountIn);
            break;
        default:
            throw new Error('Unsupported pool type');
    }

    const outputReferences = outputReferenceKeys.map((k) => {
        const tokenIndex = k % 10n;
        return {
            index: tokenIndex,
            key: Relayer.toChainedReference(k),
        };
    });

    const exitPoolRequest = {
        assets: tokensOut.map((t) => t.address), // with BPT
        minAmountsOut, // with BPT
        userData, // wihtout BPT
        toInternalBalance,
    };

    return {
        args: [
            poolId,
            kind,
            sender,
            recipient,
            exitPoolRequest,
            outputReferences,
        ] as const,
    };
};
