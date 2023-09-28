import { Hex } from '../../types';
import { getPoolAddress } from '../../utils';
import { WeightedEncoder } from '../encoders';
import { ComposableStableEncoder } from '../encoders/composableStable';
import { NestedJoinArgs } from '../nestedJoin';
import { Relayer } from '../relayer';
import { replaceWrapped } from './replaceWrapped';

export function parseNestedJoinArgs({
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
}: NestedJoinArgs) {
    // replace wrapped token with native asset if needed
    const tokensIn =
        chainId && useNativeAssetAsWrappedAmountIn
            ? replaceWrapped([...sortedTokens], chainId)
            : [...sortedTokens];

    const poolAddress = getPoolAddress(poolId);
    const _maxAmountsIn = maxAmountsIn.map((a) =>
        a.isRef ? Relayer.toChainedReference(a.amount) : a.amount,
    );
    const amountsInWithoutBpt = _maxAmountsIn.filter(
        (_, i) => sortedTokens[i].address !== poolAddress, // TODO: lowercase?
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

    const value = 0n; // TODO: get from native asset amount

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
        tokensIn,
    };
}
