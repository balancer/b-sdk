import { expect } from 'vitest';
import {
    PoolJoin,
    JoinInput,
    PoolStateInput,
    Slippage,
    Address,
    JoinBuildOutput,
    JoinQueryResult,
    UnbalancedJoinInput,
    BALANCER_VAULT,
    SingleAssetJoinInput,
    ProportionalJoinInput,
    Token,
    ChainId,
    TokenAmount,
    ComposableStableJoinQueryResult,
    NATIVE_ASSETS,
} from '../../../src';
import { TxResult, sendTransactionGetBalances } from './helper';
import { JoinTxInput } from './types';
import { zeroAddress } from 'viem';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';

type JoinResult = {
    joinQueryResult: JoinQueryResult;
    joinBuildOutput: JoinBuildOutput;
    txOutput: TxResult;
};

async function sdkJoin({
    poolJoin,
    joinInput,
    poolStateInput,
    slippage,
    testAddress,
}: {
    poolJoin: PoolJoin;
    joinInput: JoinInput;
    poolStateInput: PoolStateInput;
    slippage: Slippage;
    testAddress: Address;
}): Promise<{
    joinBuildOutput: JoinBuildOutput;
    joinQueryResult: JoinQueryResult;
}> {
    const joinQueryResult = await poolJoin.query(joinInput, poolStateInput);
    const joinBuildOutput = poolJoin.buildCall({
        ...joinQueryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
    });

    return {
        joinBuildOutput,
        joinQueryResult,
    };
}

function isComposableStableJoinQueryResult(result: JoinQueryResult): boolean {
    return (result as ComposableStableJoinQueryResult).bptIndex !== undefined;
}

function getCheck(result: JoinQueryResult, isExactIn: boolean) {
    if (isComposableStableJoinQueryResult(result)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptOut, bptIndex, ...check } =
                result as ComposableStableJoinQueryResult;
            return check;
        } else {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsIn, bptIndex, ...check } =
                result as ComposableStableJoinQueryResult;
            return check;
        }
    } else {
        if (isExactIn) {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptOut, ...check } = result;
            return check;
        } else {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsIn, ...check } = result;
            return check;
        }
    }
}

/**
 * Create and submit join transaction.
 * @param txInput
 *      @param poolJoin: PoolJoin - The pool join class, used to query the join and build the join call
 *      @param poolInput: PoolStateInput - The state of the pool being joined
 *      @param joinInput: JoinInput - The parameters of the join transaction, example: bptOut, amountsIn, etc.
 *      @param testAddress: Address - The address to send the transaction from
 *      @param client: Client & PublicActions & WalletActions - The RPC client
 *      @param slippage: Slippage - The slippage tolerance for the join transaction
 */
export async function doJoin(txInput: JoinTxInput) {
    const {
        poolJoin,
        poolStateInput,
        joinInput,
        testAddress,
        client,
        slippage,
    } = txInput;

    const { joinQueryResult, joinBuildOutput } = await sdkJoin({
        poolJoin,
        joinInput,
        poolStateInput,
        slippage,
        testAddress,
    });

    const tokens = getTokensForBalanceCheck(poolStateInput);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        joinBuildOutput.to,
        joinBuildOutput.call,
        joinBuildOutput.value,
    );

    return {
        joinQueryResult,
        joinBuildOutput,
        txOutput,
    };
}

export function assertUnbalancedJoin(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    joinInput: UnbalancedJoinInput,
    joinResult: JoinResult,
    slippage: Slippage,
) {
    const { txOutput, joinQueryResult, joinBuildOutput } = joinResult;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsIn = poolStateInput.tokens.map((t) => {
        let token;
        if (
            joinInput.useNativeAssetAsWrappedAmountIn &&
            t.address === NATIVE_ASSETS[chainId].wrapped
        )
            token = new Token(chainId, zeroAddress, t.decimals);
        else token = new Token(chainId, t.address, t.decimals);
        const input = joinInput.amountsIn.find((a) => a.address === t.address);
        if (input === undefined) return TokenAmount.fromRawAmount(token, 0n);
        else return TokenAmount.fromRawAmount(token, input.rawAmount);
    });

    const expectedQueryResult: Omit<JoinQueryResult, 'bptOut' | 'bptIndex'> = {
        // Query should use same amountsIn as input
        amountsIn: expectedAmountsIn,
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        fromInternalBalance: !!joinInput.fromInternalBalance,
        addLiquidityKind: joinInput.kind,
    };

    const queryCheck = getCheck(joinQueryResult, true);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect some bpt amount
    expect(joinQueryResult.bptOut.amount > 0n).to.be.true;

    assertJoinBuildOutput(
        joinInput,
        joinQueryResult,
        joinBuildOutput,
        true,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        joinInput,
        joinQueryResult,
        joinBuildOutput,
        txOutput,
    );
}

export function assertSingleTokenJoin(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    joinInput: SingleAssetJoinInput,
    joinResult: JoinResult,
    slippage: Slippage,
) {
    const { txOutput, joinQueryResult, joinBuildOutput } = joinResult;

    if (joinQueryResult.tokenInIndex === undefined) throw Error('No index');

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const tokensWithoutBpt = poolStateInput.tokens.filter(
        (t) => t.address !== poolStateInput.address,
    );

    const expectedQueryResult: Omit<JoinQueryResult, 'amountsIn' | 'bptIndex'> =
        {
            // Query should use same bpt out as user sets
            bptOut: TokenAmount.fromRawAmount(
                bptToken,
                joinInput.bptOut.rawAmount,
            ),
            tokenInIndex: tokensWithoutBpt.findIndex(
                (t) => t.address === joinInput.tokenIn,
            ),
            // Should match inputs
            poolId: poolStateInput.id,
            poolType: poolStateInput.type,
            fromInternalBalance: !!joinInput.fromInternalBalance,
            addLiquidityKind: joinInput.kind,
        };

    const queryCheck = getCheck(joinQueryResult, false);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect only tokenIn to have amount > 0
    // (Note joinQueryResult also has value for bpt if pre-minted)
    joinQueryResult.amountsIn.forEach((a) => {
        if (
            !joinInput.useNativeAssetAsWrappedAmountIn &&
            a.token.address === joinInput.tokenIn
        )
            expect(a.amount > 0n).to.be.true;
        else if (
            joinInput.useNativeAssetAsWrappedAmountIn &&
            a.token.address === zeroAddress
        )
            expect(a.amount > 0n).to.be.true;
        else expect(a.amount).toEqual(0n);
    });

    assertJoinBuildOutput(
        joinInput,
        joinQueryResult,
        joinBuildOutput,
        false,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        joinInput,
        joinQueryResult,
        joinBuildOutput,
        txOutput,
    );
}

export function assertProportionalJoin(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    joinInput: ProportionalJoinInput,
    joinResult: JoinResult,
    slippage: Slippage,
) {
    const { txOutput, joinQueryResult, joinBuildOutput } = joinResult;

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const expectedQueryResult: Omit<JoinQueryResult, 'amountsIn' | 'bptIndex'> =
        {
            // Query should use same bpt out as user sets
            bptOut: TokenAmount.fromRawAmount(
                bptToken,
                joinInput.bptOut.rawAmount,
            ),
            // Only expect tokenInIndex for SingleAssetJoin
            tokenInIndex: undefined,
            // Should match inputs
            poolId: poolStateInput.id,
            poolType: poolStateInput.type,
            fromInternalBalance: !!joinInput.fromInternalBalance,
            addLiquidityKind: joinInput.kind,
        };

    const queryCheck = getCheck(joinQueryResult, false);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    joinQueryResult.amountsIn.forEach((a) => {
        if (a.token.address === poolStateInput.address)
            expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    assertJoinBuildOutput(
        joinInput,
        joinQueryResult,
        joinBuildOutput,
        false,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        joinInput,
        joinQueryResult,
        joinBuildOutput,
        txOutput,
    );
}

function assertTokenDeltas(
    poolStateInput: PoolStateInput,
    joinInput: JoinInput,
    joinQueryResult: JoinQueryResult,
    joinBuildOutput: JoinBuildOutput,
    txOutput: TxResult,
) {
    expect(txOutput.transactionReceipt.status).to.eq('success');

    // joinQueryResult amountsIn will have a value for the BPT token if it is a pre-minted pool
    const amountsWithoutBpt = [...joinQueryResult.amountsIn].filter(
        (t) => t.token.address !== poolStateInput.address,
    );

    // Matching order of getTokens helper: [poolTokens, BPT, native]
    const expectedDeltas = [
        ...amountsWithoutBpt.map((a) => a.amount),
        joinQueryResult.bptOut.amount,
        0n,
    ];

    // If input is wrapped native we must replace it with 0 and update native value instead
    if (joinInput.useNativeAssetAsWrappedAmountIn) {
        const index = amountsWithoutBpt.findIndex(
            (a) => a.token.address === zeroAddress,
        );
        expectedDeltas[index] = 0n;
        expectedDeltas[expectedDeltas.length - 1] = joinBuildOutput.value;
    }

    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);
}

function assertJoinBuildOutput(
    joinInput: JoinInput,
    joinQueryResult: JoinQueryResult,
    joinBuildOutput: JoinBuildOutput,
    isExactIn: boolean,
    slippage: Slippage,
) {
    // if exactIn maxAmountsIn should use same amountsIn as input else slippage should be applied
    const maxAmountsIn = isExactIn
        ? joinQueryResult.amountsIn.map((a) => a.amount)
        : joinQueryResult.amountsIn.map((a) => slippage.applyTo(a.amount));

    // if exactIn slippage should be applied to bptOut else should use same bptOut as input
    const minBptOut = isExactIn
        ? slippage.removeFrom(joinQueryResult.bptOut.amount)
        : joinQueryResult.bptOut.amount;

    const expectedBuildOutput: Omit<JoinBuildOutput, 'call'> = {
        maxAmountsIn,
        minBptOut,
        to: BALANCER_VAULT,
        // Value should equal value of any wrapped asset if using native
        value: joinInput.useNativeAssetAsWrappedAmountIn
            ? (joinQueryResult.amountsIn.find(
                  (a) => a.token.address === zeroAddress,
              )?.amount as bigint)
            : 0n,
    };

    // rome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { call, ...buildCheck } = joinBuildOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
