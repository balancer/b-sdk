import { Token } from '../token';
import {
    NestedProportionalExitInput,
    NestedSingleTokenExitInput,
    NestedExitCallAttributes,
} from './types';
import { NestedPool, NestedPoolState, PoolKind } from '../types';
import { TokenAmount } from '../tokenAmount';
import { Address } from '../../types';
import { ChainId } from '../../utils';

export const getQueryCallsAttributes = (
    input: NestedProportionalExitInput | NestedSingleTokenExitInput,
    { pools }: NestedPoolState,
    isProportional: boolean,
): {
    bptAmountIn: TokenAmount;
    callsAttributes: NestedExitCallAttributes[];
} => {
    const {
        bptAmountIn,
        chainId,
        accountAddress,
        useNativeAssetAsWrappedAmountOut = false,
        toInternalBalance = false,
    } = input;
    let callsAttributes: NestedExitCallAttributes[];

    // sort pools by descending level
    const poolsTopDown = pools.sort((a, b) => b.level - a.level);

    if (isProportional) {
        /**
         * Overall logic to build sequence of proportional exit calls:
         * 1. Go from top pool to bottom filling out input amounts and output refs
         * 2. Inputs will be bptAmountIn provided or output of the previous level
         * 3. Output at bottom level is the amountsOut
         */

        callsAttributes = getProportionalExitCallsAttributes(
            poolsTopDown,
            chainId,
            useNativeAssetAsWrappedAmountOut,
            accountAddress,
            bptAmountIn,
            toInternalBalance,
        );
    } else {
        /**
         * Overall logic to build sequence of single token exit calls:
         * 1. Go BOTTOM-UP building exit path to tokenOut
         * 2. Go through exit path filling out input amounts and output refs
         * 3. Inputs will be bptAmountIn provided or output of the previous level
         * 4. Output at bottom level is the amountOut
         */

        const { tokenOut } = input as NestedSingleTokenExitInput;

        callsAttributes = getSingleTokenExitCallsAttributes(
            poolsTopDown,
            chainId,
            useNativeAssetAsWrappedAmountOut,
            accountAddress,
            bptAmountIn,
            toInternalBalance,
            tokenOut,
        );
    }

    const bptIn = new Token(chainId, poolsTopDown[0].address, 18);
    const _bptAmountIn = TokenAmount.fromRawAmount(bptIn, bptAmountIn);
    return { callsAttributes, bptAmountIn: _bptAmountIn };
};

export const getProportionalExitCallsAttributes = (
    poolsSortedByLevel: NestedPool[],
    chainId: ChainId,
    useNativeAssetAsWrappedAmountOut: boolean,
    accountAddress: Address,
    bptAmountIn: bigint,
    toInternalBalance: boolean,
) => {
    const calls: NestedExitCallAttributes[] = [];
    for (const pool of poolsSortedByLevel) {
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));

        const sortedTokensWithoutBpt = sortedTokens.filter(
            (t) => !t.isSameAddress(pool.address),
        );
        const upperLevelCall = calls.find((call) =>
            call.sortedTokens
                .map((token) => token.address)
                .includes(pool.address),
        );
        calls.push({
            chainId: chainId,
            useNativeAssetAsWrappedAmountOut,
            sortedTokens,
            poolId: pool.id,
            poolAddress: pool.address,
            poolType: pool.type,
            kind:
                pool.type === 'ComposableStable'
                    ? PoolKind.COMPOSABLE_STABLE_V2
                    : PoolKind.WEIGHTED,
            sender: accountAddress,
            recipient: accountAddress,
            bptAmountIn:
                upperLevelCall === undefined
                    ? {
                          amount: bptAmountIn,
                          isRef: false,
                      }
                    : {
                          amount: upperLevelCall.outputReferenceKeys[
                              upperLevelCall.sortedTokens
                                  .map((token) => token.address)
                                  .indexOf(pool.address)
                          ],
                          isRef: true,
                      },
            minAmountsOut: Array(sortedTokens.length).fill(0n), // limits set to zero for query calls
            toInternalBalance,
            outputReferenceKeys: sortedTokensWithoutBpt.map(
                (token) =>
                    BigInt(poolsSortedByLevel.indexOf(pool)) * 10n +
                    BigInt(sortedTokens.indexOf(token)),
            ),
        });
    }
    return calls;
};

export const getSingleTokenExitCallsAttributes = (
    poolsTopDown: NestedPool[],
    chainId: ChainId,
    useNativeAssetAsWrappedAmountOut: boolean,
    accountAddress: Address,
    bptAmountIn: bigint,
    toInternalBalance: boolean,
    tokenOut: Address,
) => {
    // Go BOTTOM-UP building exit path to tokenOut
    const exitPath: NestedPool[] = getExitPath(tokenOut, poolsTopDown);
    const calls: NestedExitCallAttributes[] = [];

    for (let i = 0; i < exitPath.length; i++) {
        const pool = exitPath[i];
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));
        const upperLevelCall = i > 0 ? calls[i] : undefined;
        const currenTokenOut =
            i === exitPath.length - 1 ? tokenOut : exitPath[i + 1].address;
        const tokenOutIndex = sortedTokens.findIndex((t) =>
            t.isSameAddress(currenTokenOut),
        );
        calls.push({
            chainId: chainId,
            useNativeAssetAsWrappedAmountOut,
            sortedTokens,
            poolId: pool.id,
            poolAddress: pool.address,
            poolType: pool.type,
            kind:
                pool.type === 'ComposableStable'
                    ? PoolKind.COMPOSABLE_STABLE_V2
                    : PoolKind.WEIGHTED,
            sender: accountAddress,
            recipient: accountAddress,
            bptAmountIn:
                upperLevelCall === undefined
                    ? {
                          amount: bptAmountIn,
                          isRef: false,
                      }
                    : {
                          amount: upperLevelCall.outputReferenceKeys[0],
                          isRef: true,
                      },
            minAmountsOut: Array(sortedTokens.length).fill(0n), // limits set to zero for query calls
            toInternalBalance,
            outputReferenceKeys: [
                BigInt(exitPath.indexOf(pool)) * 10n + BigInt(tokenOutIndex),
            ],
            tokenOutIndex,
        });
    }
    return calls;
};

const getExitPath = (tokenOut: string, poolsTopDown: NestedPool[]) => {
    const topPool = poolsTopDown[0];
    const exitPath: NestedPool[] = [];
    let tokenOutByLevel = tokenOut;
    while (tokenOutByLevel !== topPool.address) {
        const currentPool = poolsTopDown.find(
            (p) =>
                p.address !== tokenOutByLevel && // prevents pools with BPT as token to be picked up incorrectly
                p.tokens.some((t) => t.address === tokenOutByLevel),
        ) as NestedPool;
        exitPath.unshift(currentPool);
        tokenOutByLevel = currentPool.address;
    }
    return exitPath;
};
