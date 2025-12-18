import {
    Swap,
    SwapKind,
    ExactInQueryOutput,
    ExactOutQueryOutput,
} from '@/index';
import {
    deserializeQueryOutput,
    hasSavedTestData,
} from './swapTestDataHelpers';

/**
 * Loads query output from saved test data or by querying the swap.
 * If saved data exists, it uses that. Otherwise, it queries fresh data from the fork.
 * @param savedData - Saved test data (may be undefined)
 * @param swap - The Swap instance to query if no saved data exists
 * @param fork - Fork RPC URL (required if no saved data)
 * @param expectedSwapKind - The expected swap kind to validate against
 * @returns The query output matching the expected swap kind
 * @throws Error if fork is not available when needed, or if swap kind doesn't match
 */
export async function loadQueryOutput<
    T extends ExactInQueryOutput | ExactOutQueryOutput,
>(
    savedData: unknown,
    swap: Swap,
    fork: { rpcUrl: string } | undefined,
    expectedSwapKind: SwapKind,
): Promise<T> {
    const hasSavedData = hasSavedTestData(savedData);

    if (hasSavedData) {
        // Use saved query output (skip swap.query() call)
        const savedQueryOutput = savedData.queryOutput;
        const deserialized = deserializeQueryOutput(savedQueryOutput);
        if (deserialized.swapKind !== expectedSwapKind) {
            throw new Error(
                `Saved query output swap kind mismatch: expected ${expectedSwapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut'}, got ${deserialized.swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut'}`,
            );
        }
        return deserialized as T;
    }
    // Query fresh data - fork must be available
    if (!fork) {
        throw new Error(
            'Cannot query swap: fork not initialized and no saved test data available',
        );
    }
    const queryResult = await swap.query(fork.rpcUrl);
    if (queryResult.swapKind !== expectedSwapKind) {
        throw new Error(
            `Query result swap kind mismatch: expected ${expectedSwapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut'}, got ${queryResult.swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut'}`,
        );
    }
    return queryResult as T;
}
