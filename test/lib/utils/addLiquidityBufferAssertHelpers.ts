import {
    AddLiquidityBufferBuildCallOutput,
    AddLiquidityBufferInput,
    AddLiquidityBufferQueryOutput,
    BufferState,
    ChainId,
    PublicWalletClient,
    Slippage,
} from '@/index';
import { Address, TestActions } from 'viem';
import { expect } from 'vitest';
import { TxOutput, sendTransactionGetBalances } from './helper';

/**
 * Runs full integration test assertions for buffer add liquidity.
 * Sends the transaction and verifies results.
 * @param params - Parameters for the assertion
 */
export async function assertAddLiquidityBufferResultWithForkTest({
    addLiquidityBufferInput: _addLiquidityBufferInput,
    bufferState,
    chainId: _chainId,
    client,
    testAddress,
    call,
    queryOutput,
    slippage,
}: {
    addLiquidityBufferInput: AddLiquidityBufferInput;
    bufferState: BufferState;
    chainId: ChainId;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    call: AddLiquidityBufferBuildCallOutput;
    queryOutput: AddLiquidityBufferQueryOutput;
    slippage: Slippage;
}): Promise<void> {
    // Run full integration assertions - client must be available
    if (!client) {
        throw new Error(
            'Cannot run integration assertions: client not initialized and no saved test data available. ' +
                'Either initialize a test client or ensure saved test data exists for this test case.',
        );
    }

    const tokens = [
        bufferState.wrappedToken.address,
        bufferState.underlyingToken.address,
    ];

    // Send transaction and calculate balance changes
    const txOutput: TxOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        call.to,
        call.callData,
        call.value,
    );

    expect(txOutput.transactionReceipt.status).to.eq('success');

    const expectedDeltas = [
        queryOutput.wrappedAmountIn.amount,
        queryOutput.underlyingAmountIn.amount,
    ];
    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);

    expect(call.maxWrappedAmountIn.amount).to.deep.eq(
        slippage.applyTo(queryOutput.wrappedAmountIn.amount),
    );
    expect(call.maxUnderlyingAmountIn.amount).to.deep.eq(
        slippage.applyTo(queryOutput.underlyingAmountIn.amount),
    );
}

/**
 * Compares built buffer call data against saved test data.
 * @param builtCall - The built call data
 * @param savedData - The saved test data
 */
export function assertAddLiquidityBufferResultWithSavedData(
    builtCall: AddLiquidityBufferBuildCallOutput,
    savedData: { call: unknown; permit2?: unknown },
) {
    const savedCall = savedData.call as {
        to: Address;
        callData: string;
        value: string;
        exactSharesToIssue: string;
        maxWrappedAmountIn: unknown;
        maxUnderlyingAmountIn: unknown;
    };
    expect(builtCall.callData).to.deep.equal(savedCall.callData);
    expect(builtCall.to).to.equal(savedCall.to);
    expect(builtCall.value).to.equal(BigInt(savedCall.value));
    expect(builtCall.exactSharesToIssue).to.equal(
        BigInt(savedCall.exactSharesToIssue),
    );
}
