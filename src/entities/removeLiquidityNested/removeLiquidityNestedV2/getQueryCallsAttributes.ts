import { Address } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';

import { BALANCER_RELAYER, ChainId, ZERO_ADDRESS } from '@/utils';
import { Token } from '@/entities/token';
import { NestedPoolV2, PoolKind } from '@/entities/types';
import {
    RemoveLiquidityNestedCallAttributesV2,
    RemoveLiquidityNestedProportionalInputV2,
    RemoveLiquidityNestedSingleTokenInputV2,
} from './types';
import { PoolType } from '@/types';
import { Relayer } from '@/entities/relayer';

export const getQueryCallsAttributes = (
    input:
        | RemoveLiquidityNestedProportionalInputV2
        | RemoveLiquidityNestedSingleTokenInputV2,
    pools: NestedPoolV2[],
    isProportional: boolean,
): {
    bptAmountIn: TokenAmount;
    callsAttributes: RemoveLiquidityNestedCallAttributesV2[];
} => {
    const { bptAmountIn, chainId, toInternalBalance = false } = input;
    let callsAttributes: RemoveLiquidityNestedCallAttributesV2[];

    // sort pools by descending level
    const poolsTopDown = pools.sort((a, b) => b.level - a.level);

    const accountAddressPlaceholder = ZERO_ADDRESS;

    if (isProportional) {
        callsAttributes = getProportionalCallsAttributes(
            poolsTopDown,
            chainId,
            accountAddressPlaceholder,
            bptAmountIn,
            toInternalBalance,
        );
    } else {
        const { tokenOut } = input as RemoveLiquidityNestedSingleTokenInputV2;

        callsAttributes = getSingleTokenCallsAttributes(
            poolsTopDown,
            chainId,
            accountAddressPlaceholder,
            bptAmountIn,
            toInternalBalance,
            tokenOut,
        );
    }

    const bptIn = new Token(chainId, poolsTopDown[0].address, 18);
    const _bptAmountIn = TokenAmount.fromRawAmount(bptIn, bptAmountIn);
    return { callsAttributes, bptAmountIn: _bptAmountIn };
};

const getProportionalCallsAttributes = (
    poolsSortedByLevel: NestedPoolV2[],
    chainId: ChainId,
    accountAddress: Address,
    bptAmountIn: bigint,
    toInternalBalance: boolean,
) => {
    /**
     * Overall logic to build sequence of remove liquidity nested proportional calls:
     * 1. Go from top pool to bottom filling out input amounts and output refs
     * 2. Inputs will be bptAmountIn provided or output of the previous level
     * 3. Output at bottom level is the amountsOut
     */

    const calls: RemoveLiquidityNestedCallAttributesV2[] = [];
    for (const pool of poolsSortedByLevel) {
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));

        const sortedTokensWithoutBpt = sortedTokens.filter(
            (t) => !t.isSameAddress(pool.address),
        );
        calls.push({
            chainId: chainId,
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

const getSingleTokenCallsAttributes = (
    poolsTopDown: NestedPoolV2[],
    chainId: ChainId,
    accountAddress: Address,
    bptAmountIn: bigint,
    toInternalBalance: boolean,
    tokenOut: Address,
) => {
    /**
     * Overall logic to build sequence of remove liquidity nested single token calls:
     * 1. Go BOTTOM-UP building remove liquidity path to tokenOut
     * 2. Go through remove liquidity path filling out input amounts and output refs
     * 3. Inputs will be bptAmountIn provided or output of the previous level
     * 4. Output at bottom level is the amountOut
     */

    const removeLiquidityPath: NestedPoolV2[] = getRemoveLiquidityPath(
        tokenOut,
        poolsTopDown,
    );
    const calls: RemoveLiquidityNestedCallAttributesV2[] = [];

    for (let i = 0; i < removeLiquidityPath.length; i++) {
        const pool = removeLiquidityPath[i];
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));
        const isLastCall = i === removeLiquidityPath.length - 1;
        const currenTokenOut = isLastCall
            ? tokenOut
            : removeLiquidityPath[i + 1].address;
        const tokenOutIndex = sortedTokens.findIndex((t) =>
            t.isSameAddress(currenTokenOut),
        );
        calls.push({
            chainId: chainId,
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
                        BigInt(removeLiquidityPath.indexOf(pool)) * 10n +
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

const getRemoveLiquidityPath = (
    tokenOut: string,
    poolsTopDown: NestedPoolV2[],
) => {
    const topPool = poolsTopDown[0];
    const removeLiquidityPath: NestedPoolV2[] = [];
    let tokenOutByLevel = tokenOut;
    while (tokenOutByLevel !== topPool.address) {
        const currentPool = poolsTopDown.find(
            (p) =>
                /**
                 * Filter out pools that have tokenOutByLevel as it's own address
                 * in order to prevent pools with BPT as token to be picked up
                 * incorrectly - e.g. when removing liquidity from WETH/3-POOL to DAI, the
                 * first iteration will pick 3-POOL as the "bottom" pool and update
                 * tokenOutByLevel to 3-POOL-BPT. Since 3-POOL-BPT is contained
                 * on both WETH/3-POOL and 3-POOL itself, simply checking if the
                 * pool contains that token could result in the bottom pool being
                 * picked up again.
                 */
                p.address !== tokenOutByLevel &&
                p.tokens.some((t) => t.address === tokenOutByLevel),
        ) as NestedPoolV2;
        removeLiquidityPath.unshift(currentPool);
        tokenOutByLevel = currentPool.address;
    }
    return removeLiquidityPath;
};

const getBptAmountIn = (
    pool: NestedPoolV2,
    bptAmountIn: bigint,
    calls: RemoveLiquidityNestedCallAttributesV2[],
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
    let previousCall: RemoveLiquidityNestedCallAttributesV2;
    let outputReferenceIndex: number;
    if (isProportional) {
        previousCall = calls.find((call) =>
            call.sortedTokens
                .map((token) => token.address)
                .includes(pool.address),
        ) as RemoveLiquidityNestedCallAttributesV2;
        outputReferenceIndex = previousCall.sortedTokens
            .map((token) => token.address)
            .indexOf(pool.address);
    } else {
        previousCall = calls[calls.length - 1];
        outputReferenceIndex = 0;
    }
    const previousCallOutputReference = previousCall.outputReferences.find(
        (opRef) => opRef.index === BigInt(outputReferenceIndex),
    ) as { key: bigint; index: bigint };
    return {
        amount: previousCallOutputReference.key,
        isRef: true,
    };
};

// Sender's logic: if there is a previous call, then the sender is the
// recipient of that call, otherwise it's the user.
const getSenderProportional = (
    calls: RemoveLiquidityNestedCallAttributesV2[],
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
    poolsSortedByLevel: NestedPoolV2[],
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
