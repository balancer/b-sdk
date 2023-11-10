import { ExitTxInput } from './types';
import {
    ChainId,
    RemoveLiquidityComposableStableQueryOutput,
    ExitBuildOutput,
    RemoveLiquidityQueryOutput,
    NATIVE_ASSETS,
    PoolStateInput,
    TokenAmount,
    Slippage,
    Token,
    RemoveLiquidityUnbalancedInput,
    RemoveLiquiditySingleTokenInput,
    BALANCER_VAULT,
    RemoveLiquidityInput,
    RemoveLiquidityProportionalInput,
} from '../../../src';
import { sendTransactionGetBalances, TxResult } from './helper';
import { expect } from 'vitest';
import { zeroAddress } from 'viem';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';

type ExitResult = {
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
    exitBuildOutput: ExitBuildOutput;
    txOutput: TxResult;
};

export const sdkExit = async ({
    poolExit,
    removeLiquidityInput,
    poolStateInput,
    slippage,
    testAddress,
}: Omit<ExitTxInput, 'client'>): Promise<{
    exitBuildOutput: ExitBuildOutput;
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
}> => {
    const removeLiquidityQueryOutput = await poolExit.query(
        removeLiquidityInput,
        poolStateInput,
    );
    const exitBuildOutput = poolExit.buildCall({
        ...removeLiquidityQueryOutput,
        slippage,
        sender: testAddress,
        recipient: testAddress,
    });

    return {
        exitBuildOutput,
        removeLiquidityQueryOutput,
    };
};

function isRemoveLiquidityComposableStableQueryOutput(
    result: RemoveLiquidityQueryOutput,
): boolean {
    return (
        (result as RemoveLiquidityComposableStableQueryOutput).bptIndex !==
        undefined
    );
}

function getCheck(result: RemoveLiquidityQueryOutput, isExactIn: boolean) {
    if (isRemoveLiquidityComposableStableQueryOutput(result)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsOut, bptIndex, ...check } =
                result as RemoveLiquidityComposableStableQueryOutput;
            return check;
        } else {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptIn, bptIndex, ...check } =
                result as RemoveLiquidityComposableStableQueryOutput;
            return check;
        }
    } else {
        if (isExactIn) {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsOut, ...check } = result;
            return check;
        } else {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptIn, ...check } = result;
            return check;
        }
    }
}

/**
 * Create and submit exit transaction.
 * @param txInput
 *     @param client: Client & PublicActions & WalletActions - The RPC client
 *     @param poolExit: PoolExit - The pool exit class, used to query the exit and build the exit call
 *     @param removeLiquidityInput: RemoveLiquidityInput - The parameters of the exit transaction, example: bptIn, amountsOut, etc.
 *     @param slippage: Slippage - The slippage tolerance for the exit transaction
 *     @param poolStateInput: PoolStateInput - The state of the pool being exited
 *     @param testAddress: Address - The address to send the transaction from
 *  */
export async function doExit(txInput: ExitTxInput) {
    const {
        poolExit,
        poolStateInput,
        removeLiquidityInput,
        testAddress,
        client,
        slippage,
    } = txInput;

    const { removeLiquidityQueryOutput, exitBuildOutput } = await sdkExit({
        poolExit,
        removeLiquidityInput,
        poolStateInput,
        slippage,
        testAddress,
    });

    // get tokens for balance change - pool tokens, BPT, native
    const tokens = getTokensForBalanceCheck(poolStateInput);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        exitBuildOutput.to,
        exitBuildOutput.call,
        exitBuildOutput.value,
    );

    return {
        removeLiquidityQueryOutput,
        exitBuildOutput,
        txOutput,
    };
}

export function assertUnbalancedExit(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    removeLiquidityInput: RemoveLiquidityUnbalancedInput,
    exitResult: ExitResult,
    slippage: Slippage,
) {
    const { txOutput, removeLiquidityQueryOutput, exitBuildOutput } =
        exitResult;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsOut = poolStateInput.tokens.map((t) => {
        let token;
        if (
            removeLiquidityInput.exitWithNativeAsset &&
            t.address === NATIVE_ASSETS[chainId].wrapped
        )
            token = new Token(chainId, zeroAddress, t.decimals);
        else token = new Token(chainId, t.address, t.decimals);
        const input = removeLiquidityInput.amountsOut.find(
            (a) => a.address === t.address,
        );
        if (input === undefined) return TokenAmount.fromRawAmount(token, 0n);
        else return TokenAmount.fromRawAmount(token, input.rawAmount);
    });

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'bptIn' | 'bptIndex'
    > = {
        // Query should use same amountsOut as input
        amountsOut: expectedAmountsOut,
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(removeLiquidityQueryOutput.bptIn.amount > 0n).to.be.true;

    assertExitBuildOutput(
        removeLiquidityQueryOutput,
        exitBuildOutput,
        false,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
    );
}

export function assertSingleTokenExit(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    removeLiquidityInput: RemoveLiquiditySingleTokenInput,
    exitResult: ExitResult,
    slippage: Slippage,
) {
    const { txOutput, removeLiquidityQueryOutput, exitBuildOutput } =
        exitResult;

    if (removeLiquidityQueryOutput.tokenOutIndex === undefined)
        throw Error('No index');

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const tokensWithoutBpt = poolStateInput.tokens.filter(
        (t) => t.address !== poolStateInput.address,
    );

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'amountsOut' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(
            bptToken,
            removeLiquidityInput.bptIn.rawAmount,
        ),
        tokenOutIndex: tokensWithoutBpt.findIndex(
            (t) => t.address === removeLiquidityInput.tokenOut,
        ),
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect only tokenOut to have amount > 0
    // (Note removeLiquidityQueryOutput also has value for bpt if pre-minted)
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (
            !removeLiquidityInput.exitWithNativeAsset &&
            a.token.address === removeLiquidityInput.tokenOut
        )
            expect(a.amount > 0n).to.be.true;
        else if (
            removeLiquidityInput.exitWithNativeAsset &&
            a.token.address === zeroAddress
        )
            expect(a.amount > 0n).to.be.true;
        else expect(a.amount).toEqual(0n);
    });

    assertExitBuildOutput(
        removeLiquidityQueryOutput,
        exitBuildOutput,
        true,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
    );
}

export function assertProportionalExit(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    removeLiquidityInput: RemoveLiquidityProportionalInput,
    exitResult: ExitResult,
    slippage: Slippage,
) {
    const { txOutput, removeLiquidityQueryOutput, exitBuildOutput } =
        exitResult;

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'amountsOut' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(
            bptToken,
            removeLiquidityInput.bptIn.rawAmount,
        ),
        // Only expect tokenInIndex for AddLiquiditySingleAsset
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (a.token.address === poolStateInput.address)
            expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    assertExitBuildOutput(
        removeLiquidityQueryOutput,
        exitBuildOutput,
        true,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
    );
}

function assertTokenDeltas(
    poolStateInput: PoolStateInput,
    removeLiquidityInput: RemoveLiquidityInput,
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput,
    txOutput: TxResult,
) {
    expect(txOutput.transactionReceipt.status).to.eq('success');

    // removeLiquidityQueryOutput amountsOut will have a value for the BPT token if it is a pre-minted pool
    const amountsWithoutBpt = [...removeLiquidityQueryOutput.amountsOut].filter(
        (t) => t.token.address !== poolStateInput.address,
    );

    // Matching order of getTokens helper: [poolTokens, BPT, native]
    const expectedDeltas = [
        ...amountsWithoutBpt.map((a) => a.amount),
        removeLiquidityQueryOutput.bptIn.amount,
        0n,
    ];

    // If input is exit with native we must replace it with 0 and update native value instead
    if (removeLiquidityInput.exitWithNativeAsset) {
        const index = amountsWithoutBpt.findIndex(
            (a) => a.token.address === zeroAddress,
        );
        expectedDeltas[expectedDeltas.length - 1] = expectedDeltas[index];
        expectedDeltas[index] = 0n;
    }

    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);
}

function assertExitBuildOutput(
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput,
    exitBuildOutput: ExitBuildOutput,
    isExactIn: boolean,
    slippage: Slippage,
) {
    // if exactIn minAmountsOut should use amountsOut with slippage applied, else should use same amountsOut as input
    // slippage.removeFrom(a.amount)
    const minAmountsOut = isExactIn
        ? removeLiquidityQueryOutput.amountsOut.map((a) =>
              TokenAmount.fromRawAmount(a.token, slippage.removeFrom(a.amount)),
          )
        : [...removeLiquidityQueryOutput.amountsOut];

    // if exactIn slippage cannot be applied to bptIn, else should use bptIn with slippage applied
    const maxBptIn = isExactIn
        ? ({ ...removeLiquidityQueryOutput.bptIn } as TokenAmount)
        : TokenAmount.fromRawAmount(
              removeLiquidityQueryOutput.bptIn.token,
              slippage.applyTo(removeLiquidityQueryOutput.bptIn.amount),
          );

    const expectedBuildOutput: Omit<ExitBuildOutput, 'call'> = {
        minAmountsOut,
        maxBptIn,
        to: BALANCER_VAULT,
        // Value should always be 0 for exits
        value: 0n,
    };

    // rome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { call, ...buildCheck } = exitBuildOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
