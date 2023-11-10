import { expect } from 'vitest';
import {
    AddLiquidity,
    AddLiquidityInput,
    PoolStateInput,
    Slippage,
    Address,
    AddLiquidityBuildOutput,
    AddLiquidityQueryResult,
    AddLiquidityUnbalancedInput,
    BALANCER_VAULT,
    AddLiquiditySingleAssetInput,
    AddLiquidityProportionalInput,
    Token,
    ChainId,
    TokenAmount,
    AddLiquidityComposableStableQueryResult,
    NATIVE_ASSETS,
} from '../../../src';
import { TxResult, sendTransactionGetBalances } from './helper';
import { JoinTxInput } from './types';
import { zeroAddress } from 'viem';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';

type JoinResult = {
    addLiquidityQueryResult: AddLiquidityQueryResult;
    addLiquidityBuildOutput: AddLiquidityBuildOutput;
    txOutput: TxResult;
};

async function sdkJoin({
    addLiquidity,
    addLiquidityInput,
    poolStateInput,
    slippage,
    testAddress,
}: {
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    poolStateInput: PoolStateInput;
    slippage: Slippage;
    testAddress: Address;
}): Promise<{
    addLiquidityBuildOutput: AddLiquidityBuildOutput;
    addLiquidityQueryResult: AddLiquidityQueryResult;
}> {
    const addLiquidityQueryResult = await addLiquidity.query(
        addLiquidityInput,
        poolStateInput,
    );
    const addLiquidityBuildOutput = addLiquidity.buildCall({
        ...addLiquidityQueryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
    });

    return {
        addLiquidityBuildOutput,
        addLiquidityQueryResult,
    };
}

function isAddLiquidityComposableStableQueryResult(
    result: AddLiquidityQueryResult,
): boolean {
    return (
        (result as AddLiquidityComposableStableQueryResult).bptIndex !==
        undefined
    );
}

function getCheck(result: AddLiquidityQueryResult, isExactIn: boolean) {
    if (isAddLiquidityComposableStableQueryResult(result)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptOut, bptIndex, ...check } =
                result as AddLiquidityComposableStableQueryResult;
            return check;
        } else {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsIn, bptIndex, ...check } =
                result as AddLiquidityComposableStableQueryResult;
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
 *      @param addLiquidity: AddLiquidity - The pool join class, used to query the join and build the join call
 *      @param poolInput: PoolStateInput - The state of the pool being joined
 *      @param addLiquidityInput: AddLiquidityInput - The parameters of the join transaction, example: bptOut, amountsIn, etc.
 *      @param testAddress: Address - The address to send the transaction from
 *      @param client: Client & PublicActions & WalletActions - The RPC client
 *      @param slippage: Slippage - The slippage tolerance for the join transaction
 */
export async function doJoin(txInput: JoinTxInput) {
    const {
        addLiquidity,
        poolStateInput,
        addLiquidityInput,
        testAddress,
        client,
        slippage,
    } = txInput;

    const { addLiquidityQueryResult, addLiquidityBuildOutput } = await sdkJoin({
        addLiquidity,
        addLiquidityInput,
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
        addLiquidityBuildOutput.to,
        addLiquidityBuildOutput.call,
        addLiquidityBuildOutput.value,
    );

    return {
        addLiquidityQueryResult,
        addLiquidityBuildOutput,
        txOutput,
    };
}

export function assertUnbalancedJoin(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    addLiquidityInput: AddLiquidityUnbalancedInput,
    joinResult: JoinResult,
    slippage: Slippage,
) {
    const { txOutput, addLiquidityQueryResult, addLiquidityBuildOutput } =
        joinResult;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsIn = poolStateInput.tokens.map((t) => {
        let token;
        if (
            addLiquidityInput.useNativeAssetAsWrappedAmountIn &&
            t.address === NATIVE_ASSETS[chainId].wrapped
        )
            token = new Token(chainId, zeroAddress, t.decimals);
        else token = new Token(chainId, t.address, t.decimals);
        const input = addLiquidityInput.amountsIn.find(
            (a) => a.address === t.address,
        );
        if (input === undefined) return TokenAmount.fromRawAmount(token, 0n);
        else return TokenAmount.fromRawAmount(token, input.rawAmount);
    });

    const expectedQueryResult: Omit<
        AddLiquidityQueryResult,
        'bptOut' | 'bptIndex'
    > = {
        // Query should use same amountsIn as input
        amountsIn: expectedAmountsIn,
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        fromInternalBalance: !!addLiquidityInput.fromInternalBalance,
        addLiquidityKind: addLiquidityInput.kind,
    };

    const queryCheck = getCheck(addLiquidityQueryResult, true);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect some bpt amount
    expect(addLiquidityQueryResult.bptOut.amount > 0n).to.be.true;

    assertAddLiquidityBuildOutput(
        addLiquidityInput,
        addLiquidityQueryResult,
        addLiquidityBuildOutput,
        true,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        addLiquidityInput,
        addLiquidityQueryResult,
        addLiquidityBuildOutput,
        txOutput,
    );
}

export function assertSingleTokenJoin(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    addLiquidityInput: AddLiquiditySingleAssetInput,
    joinResult: JoinResult,
    slippage: Slippage,
) {
    const { txOutput, addLiquidityQueryResult, addLiquidityBuildOutput } =
        joinResult;

    if (addLiquidityQueryResult.tokenInIndex === undefined)
        throw Error('No index');

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const tokensWithoutBpt = poolStateInput.tokens.filter(
        (t) => t.address !== poolStateInput.address,
    );

    const expectedQueryResult: Omit<
        AddLiquidityQueryResult,
        'amountsIn' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptOut: TokenAmount.fromRawAmount(
            bptToken,
            addLiquidityInput.bptOut.rawAmount,
        ),
        tokenInIndex: tokensWithoutBpt.findIndex(
            (t) => t.address === addLiquidityInput.tokenIn,
        ),
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        fromInternalBalance: !!addLiquidityInput.fromInternalBalance,
        addLiquidityKind: addLiquidityInput.kind,
    };

    const queryCheck = getCheck(addLiquidityQueryResult, false);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect only tokenIn to have amount > 0
    // (Note addLiquidityQueryResult also has value for bpt if pre-minted)
    addLiquidityQueryResult.amountsIn.forEach((a) => {
        if (
            !addLiquidityInput.useNativeAssetAsWrappedAmountIn &&
            a.token.address === addLiquidityInput.tokenIn
        )
            expect(a.amount > 0n).to.be.true;
        else if (
            addLiquidityInput.useNativeAssetAsWrappedAmountIn &&
            a.token.address === zeroAddress
        )
            expect(a.amount > 0n).to.be.true;
        else expect(a.amount).toEqual(0n);
    });

    assertAddLiquidityBuildOutput(
        addLiquidityInput,
        addLiquidityQueryResult,
        addLiquidityBuildOutput,
        false,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        addLiquidityInput,
        addLiquidityQueryResult,
        addLiquidityBuildOutput,
        txOutput,
    );
}

export function assertProportionalJoin(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    addLiquidityInput: AddLiquidityProportionalInput,
    joinResult: JoinResult,
    slippage: Slippage,
) {
    const { txOutput, addLiquidityQueryResult, addLiquidityBuildOutput } =
        joinResult;

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const expectedQueryResult: Omit<
        AddLiquidityQueryResult,
        'amountsIn' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptOut: TokenAmount.fromRawAmount(
            bptToken,
            addLiquidityInput.bptOut.rawAmount,
        ),
        // Only expect tokenInIndex for SingleAssetJoin
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        fromInternalBalance: !!addLiquidityInput.fromInternalBalance,
        addLiquidityKind: addLiquidityInput.kind,
    };

    const queryCheck = getCheck(addLiquidityQueryResult, false);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    addLiquidityQueryResult.amountsIn.forEach((a) => {
        if (a.token.address === poolStateInput.address)
            expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    assertAddLiquidityBuildOutput(
        addLiquidityInput,
        addLiquidityQueryResult,
        addLiquidityBuildOutput,
        false,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        addLiquidityInput,
        addLiquidityQueryResult,
        addLiquidityBuildOutput,
        txOutput,
    );
}

function assertTokenDeltas(
    poolStateInput: PoolStateInput,
    addLiquidityInput: AddLiquidityInput,
    addLiquidityQueryResult: AddLiquidityQueryResult,
    addLiquidityBuildOutput: AddLiquidityBuildOutput,
    txOutput: TxResult,
) {
    expect(txOutput.transactionReceipt.status).to.eq('success');

    // addLiquidityQueryResult amountsIn will have a value for the BPT token if it is a pre-minted pool
    const amountsWithoutBpt = [...addLiquidityQueryResult.amountsIn].filter(
        (t) => t.token.address !== poolStateInput.address,
    );

    // Matching order of getTokens helper: [poolTokens, BPT, native]
    const expectedDeltas = [
        ...amountsWithoutBpt.map((a) => a.amount),
        addLiquidityQueryResult.bptOut.amount,
        0n,
    ];

    // If input is wrapped native we must replace it with 0 and update native value instead
    if (addLiquidityInput.useNativeAssetAsWrappedAmountIn) {
        const index = amountsWithoutBpt.findIndex(
            (a) => a.token.address === zeroAddress,
        );
        expectedDeltas[index] = 0n;
        expectedDeltas[expectedDeltas.length - 1] =
            addLiquidityBuildOutput.value;
    }

    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);
}

function assertAddLiquidityBuildOutput(
    addLiquidityInput: AddLiquidityInput,
    addLiquidityQueryResult: AddLiquidityQueryResult,
    addLiquidityBuildOutput: AddLiquidityBuildOutput,
    isExactIn: boolean,
    slippage: Slippage,
) {
    // if exactIn maxAmountsIn should use same amountsIn as input else slippage should be applied
    const maxAmountsIn = isExactIn
        ? addLiquidityQueryResult.amountsIn.map((a) => a.amount)
        : addLiquidityQueryResult.amountsIn.map((a) =>
              slippage.applyTo(a.amount),
          );

    // if exactIn slippage should be applied to bptOut else should use same bptOut as input
    const minBptOut = isExactIn
        ? slippage.removeFrom(addLiquidityQueryResult.bptOut.amount)
        : addLiquidityQueryResult.bptOut.amount;

    const expectedBuildOutput: Omit<AddLiquidityBuildOutput, 'call'> = {
        maxAmountsIn,
        minBptOut,
        to: BALANCER_VAULT,
        // Value should equal value of any wrapped asset if using native
        value: addLiquidityInput.useNativeAssetAsWrappedAmountIn
            ? (addLiquidityQueryResult.amountsIn.find(
                  (a) => a.token.address === zeroAddress,
              )?.amount as bigint)
            : 0n,
    };

    // rome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { call, ...buildCheck } = addLiquidityBuildOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
