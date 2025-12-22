import {
    AddLiquidityBufferV3,
    AddLiquidityBufferInput,
    AddLiquidityBufferQueryOutput,
    BufferState,
} from '@/index';
import {
    deserializeBufferQueryOutput,
    hasSavedTestData,
} from './addLiquidityTestDataHelpers';

/**
 * Loads buffer query output from saved test data or by querying the add liquidity buffer.
 * If saved data exists, it uses that. Otherwise, it queries fresh data from the fork.
 * @param savedData - Saved test data (may be undefined)
 * @param addLiquidityBuffer - The AddLiquidityBufferV3 instance to query if no saved data exists
 * @param addLiquidityBufferInput - The add liquidity buffer input
 * @param bufferState - The buffer state
 * @param fork - Fork RPC URL (required if no saved data)
 * @returns The query output
 * @throws Error if fork is not available when needed
 */
export async function loadBufferQueryOutput(
    savedData: unknown,
    addLiquidityBuffer: AddLiquidityBufferV3,
    addLiquidityBufferInput: AddLiquidityBufferInput,
    bufferState: BufferState,
    fork: { rpcUrl: string } | undefined,
): Promise<AddLiquidityBufferQueryOutput> {
    const hasSavedData = hasSavedTestData(savedData);

    if (hasSavedData) {
        // Use saved query output (skip addLiquidityBuffer.query() call)
        const savedQueryOutput = savedData.queryOutput;
        return deserializeBufferQueryOutput(savedQueryOutput);
    }

    // Query fresh data - fork must be available
    if (!fork) {
        throw new Error(
            'Cannot query add liquidity buffer: fork not initialized and no saved test data available. ' +
                'Either initialize a fork or ensure saved test data exists for this test case.',
        );
    }

    // Update rpcUrl in input if needed
    const inputWithRpcUrl = {
        ...addLiquidityBufferInput,
        rpcUrl: fork.rpcUrl,
    };

    return await addLiquidityBuffer.query(inputWithRpcUrl, bufferState);
}

