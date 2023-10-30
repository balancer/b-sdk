import { Hex } from '../../types';
import { WeightedEncoder } from '../encoders';
import { ComposableStableEncoder } from '../encoders/composableStable';
import { NestedExitCallAttributes } from './types';
import { replaceWrapped } from '../utils/replaceWrapped';
import { batchRelayerLibraryAbi } from '../../abi';
import { encodeFunctionData } from 'viem';

export const encodeCalls = (
    callsAttributes: NestedExitCallAttributes[],
    isProportional: boolean,
) => {
    const encodedCalls: Hex[] = [];
    for (const callAttributes of callsAttributes) {
        const {
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
            outputReferences,
            tokenOutIndex,
        } = callAttributes;

        // replace wrapped token with native asset if needed
        let tokensOut = [...sortedTokens];
        if (useNativeAssetAsWrappedAmountOut) {
            tokensOut = replaceWrapped([...sortedTokens], chainId);
        }

        let userData: Hex;
        if (isProportional) {
            userData = getUserDataProportional(poolType, bptAmountIn.amount);
        } else {
            userData = getUserDataSingleToken(
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

const getUserDataProportional = (poolType: string, bptAmountIn: bigint) => {
    switch (poolType) {
        case 'Weighted':
            return WeightedEncoder.exitProportional(bptAmountIn);
        case 'ComposableStable':
            return ComposableStableEncoder.exitProportional(bptAmountIn);
        default:
            throw new Error('Unsupported pool type');
    }
};

const getUserDataSingleToken = (
    tokenOutIndex: number | undefined,
    poolType: string,
    bptAmountIn: bigint,
) => {
    if (tokenOutIndex === undefined) {
        throw new Error(
            "tokenOutIndex can't be undefined for single token exits",
        );
    }
    switch (poolType) {
        case 'Weighted':
            return WeightedEncoder.exitSingleAsset(bptAmountIn, tokenOutIndex);
        case 'ComposableStable':
            return ComposableStableEncoder.exitSingleAsset(
                bptAmountIn,
                tokenOutIndex,
            );
        default:
            throw new Error('Unsupported pool type');
    }
};
