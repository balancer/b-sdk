import { Address, TestActions, zeroAddress } from 'viem';
import {
    AddLiquidityBoostedInput,
    AddLiquidityBoostedQueryOutput,
    AddLiquidityBuildCallOutput,
    PublicWalletClient,
    Token,
    TokenAmount,
    AddLiquidityKind,
} from '@/index';
import { expect } from 'vitest';
import { sendTransactionGetBalances, TxOutput } from './helper';
import {
    assertAddLiquidityBoostedUnbalanced,
    assertAddLiquidityBoostedProportional,
} from './addLiquidityBoostedHelper';

/**
 * Runs full integration test assertions for boosted add liquidity.
 * Sends the transaction and verifies results using existing assertion helpers.
 * @param params - Parameters for the assertion
 */
export async function assertAddLiquidityBoostedResultWithForkTest({
    addLiquidityBoostedInput,
    client,
    testAddress,
    call,
    queryOutput,
    wethIsEth,
}: {
    addLiquidityBoostedInput: AddLiquidityBoostedInput;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    call: AddLiquidityBuildCallOutput;
    queryOutput: AddLiquidityBoostedQueryOutput;
    wethIsEth?: boolean;
}): Promise<void> {
    // Run full integration assertions - client must be available
    if (!client) {
        throw new Error(
            'Cannot run integration assertions: client not initialized and no saved test data available. ' +
                'Either initialize a test client or ensure saved test data exists for this test case.',
        );
    }

    // Build tokenAmountsForBalanceCheck matching doAddLiquidityBoosted pattern:
    // - amountsIn tokens (the tokens being added)
    // - bptOut token (the BPT being received)
    // - zeroAddress (for native token balance check)
    const tokenAmountsForBalanceCheck = [
        ...queryOutput.amountsIn,
        queryOutput.bptOut,
        // add zero address so we can check for native token balance change
        TokenAmount.fromRawAmount(
            new Token(queryOutput.chainId, zeroAddress, 18),
            0n,
        ),
    ];

    // Map to addresses for balance checking - ensure we have the expected number
    const tokensForBalanceCheck = tokenAmountsForBalanceCheck.map(
        (t) => t.token.address,
    );

    // Validate we have the expected number of tokens
    const expectedTokenCount = queryOutput.amountsIn.length + 1 + 1; // amountsIn + bptOut + zeroAddress
    if (tokensForBalanceCheck.length !== expectedTokenCount) {
        throw new Error(
            `Expected ${expectedTokenCount} tokens for balance check, but got ${tokensForBalanceCheck.length}. ` +
                `amountsIn.length: ${queryOutput.amountsIn.length}, tokens: ${tokensForBalanceCheck.join(', ')}`,
        );
    }

    // Send transaction and calculate balance changes
    const txOutput: TxOutput = await sendTransactionGetBalances(
        tokensForBalanceCheck,
        client,
        testAddress,
        call.to,
        call.callData,
        call.value,
    );

    // Validate balance deltas have the expected number of elements
    if (txOutput.balanceDeltas.length !== expectedTokenCount) {
        throw new Error(
            `Expected ${expectedTokenCount} balance deltas, but got ${txOutput.balanceDeltas.length}. ` +
                `tokens checked: ${tokensForBalanceCheck.join(', ')}, ` +
                `balance deltas: ${txOutput.balanceDeltas.map((d) => d.toString()).join(', ')}`,
        );
    }

    // Use existing assertion helpers based on add liquidity kind
    const addLiquidityOutput = {
        addLiquidityBoostedQueryOutput: queryOutput,
        addLiquidityBuildCallOutput: call,
        tokenAmountsForBalanceCheck,
        txOutput: {
            transactionReceipt: txOutput.transactionReceipt,
            balanceDeltas: txOutput.balanceDeltas,
        },
    };

    if (addLiquidityBoostedInput.kind === AddLiquidityKind.Unbalanced) {
        assertAddLiquidityBoostedUnbalanced(
            addLiquidityOutput,
            wethIsEth ?? false,
        );
    } else {
        assertAddLiquidityBoostedProportional(
            addLiquidityOutput,
            wethIsEth ?? false,
        );
    }
}

/**
 * Compares built boosted call data against saved test data.
 * @param builtCall - The built call data
 * @param savedData - The saved test data
 */
export function assertAddLiquidityBoostedResultWithSavedData(
    builtCall: AddLiquidityBuildCallOutput,
    savedData: { call: unknown; permit2?: unknown },
) {
    const savedCall = savedData.call as {
        to: Address;
        callData: string;
        value: string;
        minBptOut: unknown;
        maxAmountsIn: unknown[];
    };
    expect(builtCall.callData).to.deep.equal(savedCall.callData);
    expect(builtCall.to).to.equal(savedCall.to);
    expect(builtCall.value).to.equal(BigInt(savedCall.value));
}
