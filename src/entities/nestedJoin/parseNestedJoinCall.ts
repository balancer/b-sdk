import { Hex } from '../../types';
import { ZERO_ADDRESS, getPoolAddress } from '../../utils';
import { WeightedEncoder } from '../encoders';
import { ComposableStableEncoder } from '../encoders/composableStable';
import { NestedJoinCall } from './types';
import { Relayer } from '../relayer';
import { replaceWrapped } from '../utils/replaceWrapped';

export const parseNestedJoinCall = ({
    useNativeAssetAsWrappedAmountIn,
    chainId,
    sortedTokens,
    poolId,
    poolType,
    kind,
    sender,
    recipient,
    maxAmountsIn,
    minBptOut,
    fromInternalBalance,
    outputReferenceKey,
}: NestedJoinCall) => {
    // replace wrapped token with native asset if needed
    let tokensIn = [...sortedTokens];
    let value = 0n;
    if (chainId && useNativeAssetAsWrappedAmountIn) {
        tokensIn = replaceWrapped([...sortedTokens], chainId);
        const nativeAssetIndex = tokensIn.findIndex((t) =>
            t.isSameAddress(ZERO_ADDRESS),
        );
        if (nativeAssetIndex > -1) {
            value = maxAmountsIn[nativeAssetIndex].amount;
        }
    }

    const poolAddress = getPoolAddress(poolId);
    const _maxAmountsIn = maxAmountsIn.map((a) =>
        a.isRef ? Relayer.toChainedReference(a.amount) : a.amount,
    );
    const amountsInWithoutBpt = _maxAmountsIn.filter(
        (_, i) => !sortedTokens[i].isSameAddress(poolAddress),
    );
    let userData: Hex;
    switch (poolType) {
        case 'Weighted':
            userData = WeightedEncoder.joinUnbalanced(
                amountsInWithoutBpt,
                minBptOut,
            );
            break;
        case 'ComposableStable':
            userData = ComposableStableEncoder.joinUnbalanced(
                amountsInWithoutBpt,
                minBptOut,
            );
            break;
        default:
            throw new Error('Unsupported pool type');
    }

    const outputReference = Relayer.toChainedReference(outputReferenceKey);

    const joinPoolRequest = {
        assets: tokensIn.map((t) => t.address), // with BPT
        maxAmountsIn: _maxAmountsIn, // with BPT
        userData, // wihtout BPT
        fromInternalBalance,
    };

    return {
        args: [
            poolId,
            kind,
            sender,
            recipient,
            joinPoolRequest,
            value,
            outputReference,
        ] as const,
        value,
    };
};
