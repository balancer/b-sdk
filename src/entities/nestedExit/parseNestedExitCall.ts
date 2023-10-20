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
    tokenOutIndex,
}: NestedExitCall) => {
    // replace wrapped token with native asset if needed
    let tokensOut = [...sortedTokens];
    if (useNativeAssetAsWrappedAmountOut) {
        tokensOut = replaceWrapped([...sortedTokens], chainId);
    }

    const _bptAmountIn = bptAmountIn.isRef
        ? Relayer.toChainedReference(bptAmountIn.amount)
        : bptAmountIn.amount;

    let userData: Hex;
    let outputReferences: { index: bigint; key: bigint }[] = [];

    if (tokenOutIndex === undefined) {
        // Proportional Exit
        switch (poolType) {
            case 'Weighted':
                userData = WeightedEncoder.exitProportional(_bptAmountIn);
                break;
            case 'ComposableStable':
                userData =
                    ComposableStableEncoder.exitProportional(_bptAmountIn);
                break;
            default:
                throw new Error('Unsupported pool type');
        }

        outputReferences = outputReferenceKeys.map((k) => {
            const tokenIndex = k % 10n;
            return {
                index: tokenIndex,
                key: Relayer.toChainedReference(k),
            };
        });
    } else {
        // Single Token Exit
        switch (poolType) {
            case 'Weighted':
                userData = WeightedEncoder.exitSingleAsset(
                    _bptAmountIn,
                    tokenOutIndex,
                );
                break;
            case 'ComposableStable':
                userData = ComposableStableEncoder.exitSingleAsset(
                    _bptAmountIn,
                    tokenOutIndex,
                );
                break;
            default:
                throw new Error('Unsupported pool type');
        }
        outputReferences = [
            {
                index: BigInt(tokenOutIndex),
                key: Relayer.toChainedReference(outputReferenceKeys[0]),
            },
        ];
    }

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
