import {
    AddLiquidityNestedBuildCallOutput,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutputV3,
    NATIVE_ASSETS,
    NestedPoolState,
    PublicWalletClient,
    Token,
    TokenAmount,
} from '@/index';
import { Address, TestActions, zeroAddress } from 'viem';
import { expect } from 'vitest';
import {
    TxOutput,
    areBigIntsWithinPercent,
    sendTransactionGetBalances,
} from './helper';

/**
 * Runs full integration test assertions for nested add liquidity.
 * Sends the transaction and verifies results.
 * @param params - Parameters for the assertion
 */
export async function assertAddLiquidityNestedResultWithForkTest({
    addLiquidityNestedInput: _addLiquidityNestedInput,
    nestedPoolState: _nestedPoolState,
    client,
    testAddress,
    call,
    queryOutput,
    wethIsEth,
}: {
    addLiquidityNestedInput: AddLiquidityNestedInput;
    nestedPoolState: NestedPoolState;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    call: AddLiquidityNestedBuildCallOutput;
    queryOutput: AddLiquidityNestedQueryOutputV3;
    wethIsEth?: boolean;
}): Promise<void> {
    // Run full integration assertions - client must be available
    if (!client) {
        throw new Error(
            'Cannot run integration assertions: client not initialized and no saved test data available. ' +
                'Either initialize a test client or ensure saved test data exists for this test case.',
        );
    }

    // Build tokens for balance check: amountsIn + bptOut + zeroAddress
    // This matches the pattern used in boosted tests
    const tokenAmountsForBalanceCheck = [
        ...queryOutput.amountsIn,
        queryOutput.bptOut,
        // add zero address so we can check for native token balance change
        TokenAmount.fromRawAmount(
            new Token(queryOutput.chainId, zeroAddress, 18),
            0n,
        ),
    ];

    // Map to addresses for balance checking
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

    expect(txOutput.transactionReceipt.status).to.eq('success');

    // Build expected deltas: [amountsIn, bptOut, native (if wethIsEth)]
    const expectedDeltas = [
        ...queryOutput.amountsIn.map((a) => a.amount),
        queryOutput.bptOut.amount,
        0n, // zeroAddress delta (native ETH)
    ];

    // For native input, move the WETH amount to the zeroAddress position
    if (wethIsEth) {
        const wrappedNative = NATIVE_ASSETS[queryOutput.chainId].wrapped;
        const wethIndex = queryOutput.amountsIn.findIndex(
            (a) => a.token.address === wrappedNative,
        );
        if (wethIndex >= 0) {
            // Move WETH amount to zeroAddress position
            expectedDeltas[expectedDeltas.length - 1] =
                queryOutput.amountsIn[wethIndex].amount;
            // WETH balance should not change (sent as ETH)
            expectedDeltas[wethIndex] = 0n;
        }
        expect(call.value).to.eq(expectedDeltas[expectedDeltas.length - 1]);
    } else {
        expect(call.value).to.eq(0n);
    }

    // Check amountsIn and BPT against balance deltas (excluding zeroAddress)
    expect(expectedDeltas.slice(0, -1)).to.deep.eq(
        txOutput.balanceDeltas.slice(0, -1),
    );

    // Check native ETH delta (last position)
    expect(expectedDeltas[expectedDeltas.length - 1]).to.eq(
        txOutput.balanceDeltas[txOutput.balanceDeltas.length - 1],
    );
}

/**
 * Compares built nested call data against saved test data.
 * @param builtCall - The built call data
 * @param savedData - The saved test data
 */
export function assertAddLiquidityNestedResultWithSavedData(
    builtCall: AddLiquidityNestedBuildCallOutput,
    savedData: { call: unknown; permit2?: unknown },
) {
    const savedCall = savedData.call as {
        to: Address;
        callData: string;
        value: string;
        minBptOut: string;
    };
    expect(builtCall.callData).to.deep.equal(savedCall.callData);
    expect(builtCall.to).to.equal(savedCall.to);
    expect(builtCall.value).to.equal(BigInt(savedCall.value));
    expect(builtCall.minBptOut).to.equal(BigInt(savedCall.minBptOut));
}
