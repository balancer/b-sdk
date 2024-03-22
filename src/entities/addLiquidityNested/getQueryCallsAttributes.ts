import { Token } from '../token';
import {
    BALANCER_RELAYER,
    ChainId,
    ZERO_ADDRESS,
    getPoolAddress,
} from '../../utils';
import {
    AddLiquidityNestedInput,
    AddLiquidityNestedCallAttributes,
} from './types';
import { NestedPool, PoolKind } from '../types';
import { Address, PoolType } from '../../types';
import { Relayer } from '../relayer';

export const getQueryCallsAttributes = (
    { amountsIn, chainId, fromInternalBalance }: AddLiquidityNestedInput,
    pools: NestedPool[],
): AddLiquidityNestedCallAttributes[] => {
    /**
     * Overall logic to build sequence of add liquidity calls:
     * 1. Go from bottom pool to up filling out input amounts and output refs
     * 2. Inputs will be amountsIn provided, output of the previous level or 0n
     * 3. Output at max level is the bptOut
     */

    const poolsSortedByLevel = pools.sort((a, b) => a.level - b.level);
    const accountAddressPlaceholder = ZERO_ADDRESS;

    const calls: AddLiquidityNestedCallAttributes[] = [];
    for (const pool of poolsSortedByLevel) {
        const sortedTokens = pool.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(chainId, t.address, t.decimals));
        const maxAmountsIn = getMaxAmountsIn(sortedTokens, amountsIn, calls);
        if (maxAmountsIn.every((a) => a.amount === 0n && !a.isRef)) {
            continue;
        }
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
            sender: getSender(maxAmountsIn, accountAddressPlaceholder, chainId),
            recipient: '0x', // set as placeholder - will be updated after all calls are created
            maxAmountsIn,
            minBptOut: 0n, // limits set to zero for query calls
            fromInternalBalance: fromInternalBalance ?? false,
            outputReference: Relayer.toChainedReference(
                BigInt(poolsSortedByLevel.indexOf(pool)),
            ),
        });
    }
    updateRecipients(calls, accountAddressPlaceholder);
    return calls;
};

const getMaxAmountsIn = (
    sortedTokens: Token[],
    amountsIn: { address: Address; rawAmount: bigint }[],
    calls: AddLiquidityNestedCallAttributes[],
): { amount: bigint; isRef: boolean }[] => {
    return sortedTokens.map((token) => {
        /**
         * There are 3 possible scenarios:
         * 1. token has amountIn provided by the user -> return amount
         * 2. token is the output of a previous add liquidity call -> return outputRef
         * 3. otherwise -> return zero
         */

        // 1. token has amountIn provided by the user -> return amount
        const amountIn = amountsIn.find((a) => token.isSameAddress(a.address));
        if (amountIn !== undefined) {
            return {
                amount: amountIn.rawAmount,
                isRef: false,
            };
        }

        // 2. token is the output of a previous add liquidity call -> return outputRef
        const previousCall = calls.find(
            (call) => getPoolAddress(call.poolId) === token.address,
        );
        if (previousCall !== undefined) {
            return {
                amount: previousCall.outputReference,
                isRef: true,
            };
        }

        // 3. otherwise -> return zero
        return {
            amount: 0n,
            isRef: false,
        };
    });
};

// Sender's logic: if there is at least one amountIn that is not a reference,
// then the sender is the user, otherwise it's the relayer.
const getSender = (
    maxAmountsIn: { amount: bigint; isRef: boolean }[],
    accountAddress: Address,
    chainId: ChainId,
): Address => {
    return maxAmountsIn.some((a) => !a.isRef && a.amount > 0n)
        ? accountAddress
        : BALANCER_RELAYER[chainId];
};

// Recipient's logic: if there is a following call, then the recipient is the
// sender of that call, otherwise it's the user.
const updateRecipients = (
    calls: AddLiquidityNestedCallAttributes[],
    accountAddress: Address,
) => {
    for (const call of calls) {
        const followingCall = calls.find((_call) =>
            _call.maxAmountsIn.some((a) => a.amount === call.outputReference),
        );
        if (followingCall !== undefined) {
            call.recipient = followingCall.sender;
        } else {
            call.recipient = accountAddress;
        }
    }
};
