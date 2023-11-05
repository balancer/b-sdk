import { ExitTxInput } from './types';
import {
    Address,
    ChainId,
    ComposableStableExitQueryResult,
    ExitBuildOutput,
    ExitQueryResult,
    NATIVE_ASSETS,
    PoolStateInput,
    TokenAmount,
    Slippage,
    Token,
    UnbalancedExitInput,
    ZERO_ADDRESS,
    SingleAssetExitInput,
    BALANCER_VAULT,
    ExitInput,
    ProportionalExitInput,
} from '../../../src';
import { sendTransactionGetBalances, TxResult } from './helper';
import { expect } from 'vitest';
import { zeroAddress } from 'viem';

type ExitResult = {
    exitQueryResult: ExitQueryResult;
    exitBuildOutput: ExitBuildOutput;
    txOutput: TxResult;
};

export const sdkExit = async ({
    poolExit,
    exitInput,
    poolStateInput,
    slippage,
    testAddress,
}: Omit<ExitTxInput, 'client'>): Promise<{
    exitBuildOutput: ExitBuildOutput;
    exitQueryResult: ExitQueryResult;
}> => {
    const exitQueryResult = await poolExit.query(exitInput, poolStateInput);
    const exitBuildOutput = poolExit.buildCall({
        ...exitQueryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
    });

    return {
        exitBuildOutput,
        exitQueryResult,
    };
};

function getTokens(poolStateInput: PoolStateInput): Address[] {
    // pool tokens, bpt, eth
    const tokens = poolStateInput.tokens
        .filter((t) => t.address !== poolStateInput.address)
        .map((t) => t.address);
    tokens.push(poolStateInput.address);
    tokens.push(ZERO_ADDRESS);
    return tokens;
}

function isComposableStableExitQueryResult(result: ExitQueryResult): boolean {
    return (result as ComposableStableExitQueryResult).bptIndex !== undefined;
}

function getCheck(result: ExitQueryResult, isExactIn: boolean) {
    if (isComposableStableExitQueryResult(result)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsOut, bptIndex, ...check } =
                result as ComposableStableExitQueryResult;
            return check;
        } else {
            // rome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptIn, bptIndex, ...check } =
                result as ComposableStableExitQueryResult;
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
 *     @param exitInput: ExitInput - The parameters of the exit transaction, example: bptIn, amountsOut, etc.
 *     @param slippage: Slippage - The slippage tolerance for the exit transaction
 *     @param poolStateInput: PoolStateInput - The state of the pool being exited
 *     @param testAddress: Address - The address to send the transaction from
 *  */
export async function doExit(txInput: ExitTxInput) {
    const {
        poolExit,
        poolStateInput,
        exitInput,
        testAddress,
        client,
        slippage,
    } = txInput;

    const { exitQueryResult, exitBuildOutput } = await sdkExit({
        poolExit,
        exitInput,
        poolStateInput,
        slippage,
        testAddress,
    });

    // get tokens for balance change - pool tokens, BPT, native
    const tokens = getTokens(poolStateInput);

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
        exitQueryResult,
        exitBuildOutput,
        txOutput,
    };
}

export function assertUnbalancedExit(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    exitInput: UnbalancedExitInput,
    exitResult: ExitResult,
    slippage: Slippage,
) {
    const { txOutput, exitQueryResult, exitBuildOutput } = exitResult;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsOut = poolStateInput.tokens.map((t) => {
        let token;
        if (
            exitInput.exitWithNativeAsset &&
            t.address === NATIVE_ASSETS[chainId].wrapped
        )
            token = new Token(chainId, zeroAddress, t.decimals);
        else token = new Token(chainId, t.address, t.decimals);
        const input = exitInput.amountsOut.find(
            (a) => a.token.address === t.address,
        );
        if (input === undefined) return TokenAmount.fromRawAmount(token, 0n);
        else return TokenAmount.fromRawAmount(token, input.amount);
    });

    const expectedQueryResult: Omit<ExitQueryResult, 'bptIn' | 'bptIndex'> = {
        // Query should use same amountsOut as input
        amountsOut: expectedAmountsOut,
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        toInternalBalance: !!exitInput.toInternalBalance,
        exitKind: exitInput.kind,
    };

    const queryCheck = getCheck(exitQueryResult, false);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect some bpt amount
    expect(exitQueryResult.bptIn.amount > 0n).to.be.true;

    assertExitBuildOutput(
        exitInput,
        exitQueryResult,
        exitBuildOutput,
        false,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        exitInput,
        exitQueryResult,
        exitBuildOutput,
        txOutput,
    );
}

export function assertSingleTokenExit(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    exitInput: SingleAssetExitInput,
    exitResult: ExitResult,
    slippage: Slippage,
) {
    const { txOutput, exitQueryResult, exitBuildOutput } = exitResult;

    if (exitQueryResult.tokenOutIndex === undefined) throw Error('No index');

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const tokensWithoutBpt = poolStateInput.tokens.filter(
        (t) => t.address !== poolStateInput.address,
    );

    const expectedQueryResult: Omit<
        ExitQueryResult,
        'amountsOut' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(bptToken, exitInput.bptIn.amount),
        tokenOutIndex: tokensWithoutBpt.findIndex(
            (t) => t.address === exitInput.tokenOut,
        ),
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        toInternalBalance: !!exitInput.toInternalBalance,
        exitKind: exitInput.kind,
    };

    const queryCheck = getCheck(exitQueryResult, true);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect only tokenOut to have amount > 0
    // (Note exitQueryResult also has value for bpt if pre-minted)
    exitQueryResult.amountsOut.forEach((a) => {
        if (
            !exitInput.exitWithNativeAsset &&
            a.token.address === exitInput.tokenOut
        )
            expect(a.amount > 0n).to.be.true;
        else if (
            exitInput.exitWithNativeAsset &&
            a.token.address === zeroAddress
        )
            expect(a.amount > 0n).to.be.true;
        else expect(a.amount).toEqual(0n);
    });

    assertExitBuildOutput(
        exitInput,
        exitQueryResult,
        exitBuildOutput,
        true,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        exitInput,
        exitQueryResult,
        exitBuildOutput,
        txOutput,
    );
}

export function assertProportionalExit(
    chainId: ChainId,
    poolStateInput: PoolStateInput,
    exitInput: ProportionalExitInput,
    exitResult: ExitResult,
    slippage: Slippage,
) {
    const { txOutput, exitQueryResult, exitBuildOutput } = exitResult;

    const bptToken = new Token(chainId, poolStateInput.address, 18);

    const expectedQueryResult: Omit<
        ExitQueryResult,
        'amountsOut' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(bptToken, exitInput.bptIn.amount),
        // Only expect tokenInIndex for SingleAssetJoin
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolStateInput.id,
        poolType: poolStateInput.type,
        toInternalBalance: !!exitInput.toInternalBalance,
        exitKind: exitInput.kind,
    };

    const queryCheck = getCheck(exitQueryResult, true);

    expect(queryCheck).to.deep.eq(expectedQueryResult);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    exitQueryResult.amountsOut.forEach((a) => {
        if (a.token.address === poolStateInput.address)
            expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    assertExitBuildOutput(
        exitInput,
        exitQueryResult,
        exitBuildOutput,
        true,
        slippage,
    );

    assertTokenDeltas(
        poolStateInput,
        exitInput,
        exitQueryResult,
        exitBuildOutput,
        txOutput,
    );
}

function assertTokenDeltas(
    poolStateInput: PoolStateInput,
    exitInput: ExitInput,
    exitQueryResult: ExitQueryResult,
    exitBuildOutput: ExitBuildOutput,
    txOutput: TxResult,
) {
    expect(txOutput.transactionReceipt.status).to.eq('success');

    // exitQueryResult amountsOut will have a value for the BPT token if it is a pre-minted pool
    const amountsWithoutBpt = [...exitQueryResult.amountsOut].filter(
        (t) => t.token.address !== poolStateInput.address,
    );

    // Matching order of getTokens helper: [poolTokens, BPT, native]
    const expectedDeltas = [
        ...amountsWithoutBpt.map((a) => a.amount),
        exitQueryResult.bptIn.amount,
        0n,
    ];

    // If input is exit with native we must replace it with 0 and update native value instead
    if (exitInput.exitWithNativeAsset) {
        const index = amountsWithoutBpt.findIndex(
            (a) => a.token.address === zeroAddress,
        );
        expectedDeltas[expectedDeltas.length - 1] = expectedDeltas[index];
        expectedDeltas[index] = 0n;
    }

    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);
}

function assertExitBuildOutput(
    exitInput: ExitInput,
    exitQueryResult: ExitQueryResult,
    exitBuildOutput: ExitBuildOutput,
    isExactIn: boolean,
    slippage: Slippage,
) {
    // if exactIn minAmountsOut should use amountsOut with slippage applied, else should use same amountsOut as input
    const minAmountsOut = isExactIn
        ? exitQueryResult.amountsOut.map((a) => slippage.removeFrom(a.amount))
        : exitQueryResult.amountsOut.map((a) => a.amount);

    // if exactIn slippage cannot be applied to bptIn, else should use bptIn with slippage applied
    const maxBptIn = isExactIn
        ? exitQueryResult.bptIn.amount
        : slippage.applyTo(exitQueryResult.bptIn.amount);

    const expectedBuildOutput: Omit<ExitBuildOutput, 'call'> = {
        minAmountsOut,
        maxBptIn,
        to: BALANCER_VAULT,
        // Value should equal value of any wrapped asset if using native
        value: 0n,
    };

    // rome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { call, ...buildCheck } = exitBuildOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
