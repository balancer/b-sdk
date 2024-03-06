import { Hex, PoolType } from '../../types';
import { WeightedEncoder } from '../encoders';
import { ComposableStableEncoder } from '../encoders/composableStable';
import { RemoveLiquidityNestedCallAttributes } from './types';
import { replaceWrapped } from '../utils/replaceWrapped';
import { batchRelayerLibraryAbi } from '../../abi';
import { encodeFunctionData } from 'viem';
import { removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError } from '@/utils';

export const encodeCalls = (
    callsAttributes: RemoveLiquidityNestedCallAttributes[],
    isProportional: boolean,
) => {
    const encodedCalls: Hex[] = [];
    for (const callAttributes of callsAttributes) {
        const {
            receiveNativeAsset,
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
            outputReferences,
            tokenOutIndex,
        } = callAttributes;

        // replace wrapped token with native asset if needed
        let tokensOut = [...sortedTokens];
        if (receiveNativeAsset) {
            tokensOut = replaceWrapped([...sortedTokens], chainId);
        }

        let userData: Hex;
        if (isProportional) {
            userData = getUserDataProportional(poolType, bptAmountIn.amount);
        } else {
            userData = getUserDataSingleTokenExactIn(
                tokenOutIndex,
                poolType,
                bptAmountIn.amount,
            );
        }

        const exitPoolRequest = {
            assets: tokensOut.map((t) => t.address), // with BPT
            minAmountsOut, // with BPT
            userData, // wihtout BPT
            toInternalBalance,
        };

        const encodedCall = encodeFunctionData({
            abi: batchRelayerLibraryAbi,
            functionName: 'exitPool',
            args: [
                poolId,
                kind,
                sender,
                recipient,
                exitPoolRequest,
                outputReferences,
            ] as const,
        });

        encodedCalls.push(encodedCall);
    }

    return encodedCalls;
};

const getUserDataProportional = (poolType: PoolType, bptAmountIn: bigint) => {
    switch (poolType) {
        case PoolType.Weighted:
            return WeightedEncoder.removeLiquidityProportional(bptAmountIn);
        case PoolType.ComposableStable:
            return ComposableStableEncoder.removeLiquidityProportional(
                bptAmountIn,
            );
        default:
            throw new Error(`Unsupported pool type ${poolType}`);
    }
};

const getUserDataSingleTokenExactIn = (
    tokenOutIndex: number | undefined,
    poolType: PoolType,
    bptAmountIn: bigint,
) => {
    if (tokenOutIndex === undefined) {
        throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;
    }
    switch (poolType) {
        case PoolType.Weighted:
            return WeightedEncoder.removeLiquiditySingleTokenExactIn(
                bptAmountIn,
                tokenOutIndex,
            );
        case PoolType.ComposableStable:
            return ComposableStableEncoder.removeLiquiditySingleTokenExactIn(
                bptAmountIn,
                tokenOutIndex,
            );
        default:
            throw new Error(`Unsupported pool type ${poolType}`);
    }
};
