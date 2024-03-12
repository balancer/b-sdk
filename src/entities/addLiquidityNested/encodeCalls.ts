import { Hex, PoolType } from '../../types';
import { WeightedEncoder } from '../encoders';
import { ComposableStableEncoder } from '../encoders/composableStable';
import { AddLiquidityNestedCallAttributes } from './types';
import { replaceWrapped } from '../utils/replaceWrapped';
import { batchRelayerLibraryAbi } from '../../abi';
import { encodeFunctionData } from 'viem';
import { TokenAmount } from '../tokenAmount';
import { getValue } from '../utils/getValue';

export const encodeCalls = (
    callsAttributes: AddLiquidityNestedCallAttributes[],
) => {
    const encodedCalls: Hex[] = [];
    const values: bigint[] = [];
    for (const callAttributes of callsAttributes) {
        const {
            wethIsEth,
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
        const tokensIn = wethIsEth
            ? replaceWrapped([...sortedTokens], chainId)
            : [...sortedTokens];

        const amountsIn = [...sortedTokens].map((t, i) => {
            return TokenAmount.fromRawAmount(t, maxAmountsIn[i].amount);
        });
        const value = getValue(amountsIn, !!wethIsEth);

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
            return WeightedEncoder.addLiquidityUnbalanced(
                amountsInWithoutBpt,
                minBptOut,
            );
        case PoolType.ComposableStable:
            return ComposableStableEncoder.addLiquidityUnbalanced(
                amountsInWithoutBpt,
                minBptOut,
            );
        default:
            throw new Error(`Unsupported pool type: ${poolType}`);
    }
};
