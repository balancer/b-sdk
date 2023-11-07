import { Token } from '../token';
import {
    NestedProportionalExitInput,
    NestedSingleTokenExitInput,
    NestedExitCallAttributes,
} from './types';
import { NestedPool, PoolKind } from '../types';
import { TokenAmount } from '../tokenAmount';
import { Address, PoolType } from '../../types';
import { BALANCER_RELAYER, ChainId } from '../../utils';
import { Relayer } from '../relayer';

export const getQueryCallsAttributes = (
    input: NestedProportionalExitInput | NestedSingleTokenExitInput,
    pools: NestedPool[],
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
        callsAttributes = getProportionalExitCallsAttributes(
            poolsTopDown,
            chainId,
            useNativeAssetAsWrappedAmountOut,
            accountAddress,
            bptAmountIn,
            toInternalBalance,
        );
    } else {
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
    /**
     * Overall logic to build sequence of proportional exit calls:
     * 1. Go from top pool to bottom filling out input amounts and output refs
     * 2. Inputs will be bptAmountIn provided or output of the previous level
     * 3. Output at bottom level is the amountsOut
     */

    const calls: NestedExitCallAttributes[] = [];
    for (const pool of poolsSortedByLevel) {
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));

        const sortedTokensWithoutBpt = sortedTokens.filter(
            (t) => !t.isSameAddress(pool.address),
        );
        calls.push({
            chainId: chainId,
            useNativeAssetAsWrappedAmountOut,
            sortedTokens,
            poolId: pool.id,
            poolAddress: pool.address,
            poolType: pool.type,
            kind:
                pool.type === PoolType.ComposableStable
                    ? PoolKind.COMPOSABLE_STABLE_V2
                    : PoolKind.WEIGHTED,
            sender: getSenderProportional(calls, pool.address, accountAddress),
            recipient: getRecipientProportional(
                sortedTokensWithoutBpt,
                poolsSortedByLevel,
                accountAddress,
                chainId,
            ),
            bptAmountIn: getBptAmountIn(pool, bptAmountIn, calls, true),
            minAmountsOut: Array(sortedTokens.length).fill(0n), // limits set to zero for query calls
            toInternalBalance,
            outputReferences: sortedTokensWithoutBpt.map((token) => {
                return {
                    key: Relayer.toChainedReference(
                        BigInt(poolsSortedByLevel.indexOf(pool)) * 10n +
                            BigInt(sortedTokens.indexOf(token)),
                    ),
                    index: BigInt(sortedTokens.indexOf(token)),
                };
            }),
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
    /**
     * Overall logic to build sequence of single token exit calls:
     * 1. Go BOTTOM-UP building exit path to tokenOut
     * 2. Go through exit path filling out input amounts and output refs
     * 3. Inputs will be bptAmountIn provided or output of the previous level
     * 4. Output at bottom level is the amountOut
     */

    const exitPath: NestedPool[] = getExitPath(tokenOut, poolsTopDown);
    const calls: NestedExitCallAttributes[] = [];

    for (let i = 0; i < exitPath.length; i++) {
        const pool = exitPath[i];
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));
        const isLastCall = i === exitPath.length - 1;
        const currenTokenOut = isLastCall ? tokenOut : exitPath[i + 1].address;
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
                pool.type === PoolType.ComposableStable
                    ? PoolKind.COMPOSABLE_STABLE_V2
                    : PoolKind.WEIGHTED,
            sender: i === 0 ? accountAddress : BALANCER_RELAYER[chainId],
            recipient: isLastCall ? accountAddress : BALANCER_RELAYER[chainId],
            bptAmountIn: getBptAmountIn(pool, bptAmountIn, calls, false),
            minAmountsOut: Array(sortedTokens.length).fill(0n), // limits set to zero for query calls
            toInternalBalance,
            outputReferences: [
                {
                    key: Relayer.toChainedReference(
                        BigInt(exitPath.indexOf(pool)) * 10n +
                            BigInt(tokenOutIndex),
                    ),
                    index: BigInt(tokenOutIndex),
                },
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
                /**
                 * Filter out pools that have tokenOutByLevel as it's own address
                 * in order to prevent pools with BPT as token to be picked up
                 * incorrectly - e.g. when exiting from WETH/3-POOL to DAI, the
                 * first iteration will pick 3-POOL as the "bottom" pool and update
                 * tokenOutByLevel to 3-POOL-BPT. Since 3-POOL-BPT is contained
                 * on both WETH/3-POOL and 3-POOL itself, simply checking if the
                 * pool contains that token could result in the bottom pool being
                 * picked up again.
                 */
                p.address !== tokenOutByLevel &&
                p.tokens.some((t) => t.address === tokenOutByLevel),
        ) as NestedPool;
        exitPath.unshift(currentPool);
        tokenOutByLevel = currentPool.address;
    }
    return exitPath;
};

const getBptAmountIn = (
    pool: NestedPool,
    bptAmountIn: bigint,
    calls: NestedExitCallAttributes[],
    isProportional: boolean,
) => {
    // first call has bptAmountIn provided as it's input
    if (calls.length === 0) {
        return {
            amount: bptAmountIn,
            isRef: false,
        };
    }

    // following calls have their input as the outputReference of a previous call
    let previousCall: NestedExitCallAttributes;
    let outputReferenceIndex: number;
    if (isProportional) {
        previousCall = calls.find((call) =>
            call.sortedTokens
                .map((token) => token.address)
                .includes(pool.address),
        ) as NestedExitCallAttributes;
        outputReferenceIndex = previousCall.sortedTokens
            .map((token) => token.address)
            .indexOf(pool.address);
    } else {
        previousCall = calls[calls.length - 1];
        outputReferenceIndex = 0;
    }
    return {
        amount: previousCall.outputReferences[outputReferenceIndex].key,
        isRef: true,
    };
};

// Sender's logic: if there is a previous call, then the sender is the
// recipient of that call, otherwise it's the user.
const getSenderProportional = (
    calls: NestedExitCallAttributes[],
    poolAddress: Address,
    accountAddress: Address,
): Address => {
    const previousCall = calls.find((_call) =>
        _call.sortedTokens.map((token) => token.address).includes(poolAddress),
    );
    return previousCall !== undefined ? previousCall.recipient : accountAddress;
};

// Recipient's logic: if there is at least one token that is an output of the
// whole multicall, then the recipient is the user, otherwise it's the relayer.
const getRecipientProportional = (
    sortedTokensWithoutBpt: Token[],
    poolsSortedByLevel: NestedPool[],
    accountAddress: Address,
    chainId: ChainId,
): Address => {
    const containsOutputToken = sortedTokensWithoutBpt.some(
        (token) =>
            !poolsSortedByLevel.some((_pool) =>
                token.isSameAddress(_pool.address),
            ),
    );
    return containsOutputToken ? accountAddress : BALANCER_RELAYER[chainId];
};
