import { encodeFunctionData, Hex } from 'viem';
import {
    poolTypeProtocolVersionError,
    removeLiquidityMissingTokenOutIndexError,
} from '@/utils';
import { RemoveLiquidityNestedCallAttributesV2 } from './types';
import { replaceWrapped } from '@/entities/utils';
import { batchRelayerLibraryAbi } from '@/abi';
import { PoolType } from '@/types';
import { ComposableStableEncoder, WeightedEncoder } from '@/entities/encoders';

export const encodeCalls = (
    callsAttributes: RemoveLiquidityNestedCallAttributesV2[],
    isProportional: boolean,
) => {
    const encodedCalls: Hex[] = [];
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
            bptAmountIn,
            minAmountsOut,
            toInternalBalance,
            outputReferences,
            tokenOutIndex,
        } = callAttributes;

        // replace wrapped token with native asset if needed
        let tokensOut = [...sortedTokens];
        if (wethIsEth) {
            tokensOut = replaceWrapped([...sortedTokens], chainId);
        }

        let userData: Hex;
        if (isProportional) {
            userData = getUserDataProportional(poolType, bptAmountIn.amount);
        } else {
            if (tokenOutIndex === undefined) {
                throw removeLiquidityMissingTokenOutIndexError();
            }

            // skip bpt index for ComposableStable pools
            const bptIndex = sortedTokens.findIndex((t) =>
                t.isSameAddress(poolAddress),
            );
            const tokenOutIndexWithoutBpt =
                bptIndex === -1 || tokenOutIndex < bptIndex
                    ? tokenOutIndex
                    : tokenOutIndex - 1;

            userData = getUserDataSingleTokenExactIn(
                tokenOutIndexWithoutBpt,
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
            throw poolTypeProtocolVersionError(
                'RemoveLiquidityNested',
                poolType,
                2,
            );
    }
};

const getUserDataSingleTokenExactIn = (
    tokenOutIndex: number | undefined,
    poolType: PoolType,
    bptAmountIn: bigint,
) => {
    if (tokenOutIndex === undefined) {
        throw removeLiquidityMissingTokenOutIndexError();
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
            throw poolTypeProtocolVersionError(
                'RemoveLiquidityNested',
                poolType,
                2,
            );
    }
};
