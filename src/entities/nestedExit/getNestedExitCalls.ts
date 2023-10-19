import { Token } from '../token';
import { NestedExitInput, NestedExitCall } from './types';
import { NestedPool, NestedPoolState } from '../types';
import { TokenAmount } from '../tokenAmount';
import { Address } from '../../types';

export const getNestedExitCalls = (
    {
        bptAmountIn,
        chainId,
        accountAddress,
        tokenOut,
        useNativeAssetAsWrappedAmountOut = false,
        toInternalBalance = false,
    }: NestedExitInput,
    { pools }: NestedPoolState,
): { bptAmountIn: TokenAmount; calls: NestedExitCall[] } => {
    const isProportional = tokenOut === undefined;
    let poolsTopDown: NestedPool[];
    let calls: NestedExitCall[];

    if (isProportional) {
        /**
         * Overall logic to build sequence of proportional exit calls:
         * 1. Go from top pool to bottom filling out input amounts and output refs
         * 2. Inputs will be bptAmountIn provided or output of the previous level
         * 3. Output at bottom level is the amountsOut
         */

        // sort pools by descending level
        poolsTopDown = pools.sort((a, b) => b.level - a.level);

        calls = getProportionalExitCalls(
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

        // sort pools by descending level
        poolsTopDown = pools.sort((a, b) => b.level - a.level);
        const topPool = poolsTopDown[0];

        // Go BOTTOM-UP building exit path to tokenOut
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

        calls = getSingleTokenExitCalls(
            exitPath,
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
    return { calls, bptAmountIn: _bptAmountIn };
};

export const getProportionalExitCalls = (
    poolsSortedByLevel: NestedPool[],
    chainId: number,
    useNativeAssetAsWrappedAmountOut: boolean,
    accountAddress: Address,
    bptAmountIn: bigint,
    toInternalBalance: boolean,
) => {
    const calls: NestedExitCall[] = [];
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
            poolType: pool.type,
            kind: pool.type === 'ComposableStable' ? 3 : 0,
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
            minAmountsOut: Array(sortedTokens.length).fill(0n),
            toInternalBalance,
            outputReferenceKeys: sortedTokensWithoutBpt.map(
                (token) =>
                    100n +
                    BigInt(poolsSortedByLevel.indexOf(pool)) * 10n +
                    BigInt(sortedTokens.indexOf(token)),
            ),
        });
    }
    return calls;
};

export const getSingleTokenExitCalls = (
    exitPath: NestedPool[],
    chainId: number,
    useNativeAssetAsWrappedAmountOut: boolean,
    accountAddress: Address,
    bptAmountIn: bigint,
    toInternalBalance: boolean,
    tokenOut: Address,
) => {
    const calls: NestedExitCall[] = [];

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
            poolType: pool.type,
            kind: pool.type === 'ComposableStable' ? 3 : 0,
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
            minAmountsOut: Array(sortedTokens.length).fill(0n),
            toInternalBalance,
            outputReferenceKeys: [
                100n +
                    BigInt(exitPath.indexOf(pool)) * 10n +
                    BigInt(tokenOutIndex),
            ],
            tokenOutIndex,
        });
    }
    return calls;
};
