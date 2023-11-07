import { Hex, PoolType } from '../../types';
import { ZERO_ADDRESS } from '../../utils';
import { WeightedEncoder } from '../encoders';
import { ComposableStableEncoder } from '../encoders/composableStable';
import { NestedJoinCallAttributes } from './types';
import { replaceWrapped } from '../utils/replaceWrapped';
import { batchRelayerLibraryAbi } from '../../abi';
import { encodeFunctionData } from 'viem';

export const encodeCalls = (callsAttributes: NestedJoinCallAttributes[]) => {
    const encodedCalls: Hex[] = [];
    const values: bigint[] = [];
    for (const callAttributes of callsAttributes) {
        const {
            useNativeAssetAsWrappedAmountIn,
            chainId,
            sortedTokens,
            poolId,
            poolAddress,
            poolType,
            kind,
            sender,
            recipient,
            maxAmountsIn,
            minBptOut,
            fromInternalBalance,
            outputReference,
        } = callAttributes;

        // replace wrapped token with native asset if needed
        let tokensIn = [...sortedTokens];

        let value = 0n;
        if (useNativeAssetAsWrappedAmountIn) {
            tokensIn = replaceWrapped([...sortedTokens], chainId);
            const nativeAssetIndex = tokensIn.findIndex((t) =>
                t.isSameAddress(ZERO_ADDRESS),
            );
            if (nativeAssetIndex > -1) {
                value = maxAmountsIn[nativeAssetIndex].amount;
            }
        }

        const _maxAmountsIn = maxAmountsIn.map((a) => a.amount);
        const amountsInWithoutBpt = _maxAmountsIn.filter(
            (_, i) => !sortedTokens[i].isSameAddress(poolAddress),
        );
        const userData = getUserData(poolType, amountsInWithoutBpt, minBptOut);

        const joinPoolRequest = {
            assets: tokensIn.map((t) => t.address), // with BPT
            maxAmountsIn: _maxAmountsIn, // with BPT
            userData, // wihtout BPT
            fromInternalBalance,
        };

        const encodedCall = encodeFunctionData({
            abi: batchRelayerLibraryAbi,
            functionName: 'joinPool',
            args: [
                poolId,
                kind,
                sender,
                recipient,
                joinPoolRequest,
                value,
                outputReference,
            ] as const,
        });

        encodedCalls.push(encodedCall);
        values.push(value);
    }
    return { encodedCalls, values };
};

const getUserData = (
    poolType: PoolType,
    amountsInWithoutBpt: bigint[],
    minBptOut: bigint,
) => {
    switch (poolType) {
        case PoolType.Weighted:
            return WeightedEncoder.joinUnbalanced(
                amountsInWithoutBpt,
                minBptOut,
            );
        case PoolType.ComposableStable:
            return ComposableStableEncoder.joinUnbalanced(
                amountsInWithoutBpt,
                minBptOut,
            );
        default:
            throw new Error(`Unsupported pool type: ${poolType}`);
    }
};
