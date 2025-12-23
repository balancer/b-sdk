import {
    AddLiquidity,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    PoolState,
} from '@/index';
import {
    deserializeQueryOutput,
    hasSavedTestData,
} from './addLiquidityTestDataHelpers';

/**
 * Loads query output from saved test data or by querying the add liquidity.
 * If saved data exists, it uses that. Otherwise, it queries fresh data from the fork.
 * @param savedData - Saved test data (may be undefined)
 * @param addLiquidity - The AddLiquidity instance to query if no saved data exists
 * @param addLiquidityInput - The add liquidity input
 * @param poolState - The pool state
 * @param fork - Fork RPC URL (required if no saved data)
 * @returns The query output
 * @throws Error if fork is not available when needed
 */
export async function loadQueryOutput(
    savedData: unknown,
    addLiquidity: AddLiquidity,
    addLiquidityInput: AddLiquidityInput,
    poolState: PoolState,
    fork: { rpcUrl: string } | undefined,
): Promise<AddLiquidityQueryOutput> {
    const hasSavedData = hasSavedTestData(savedData);

    if (hasSavedData) {
        // Use saved query output (skip addLiquidity.query() call)
        const savedQueryOutput = savedData.queryOutput;
        return deserializeQueryOutput(savedQueryOutput);
    }

    // Query fresh data - fork must be available
    if (!fork) {
        throw new Error(
            'Cannot query add liquidity: fork not initialized and no saved test data available. ' +
                'Either initialize a fork or ensure saved test data exists for this test case.',
        );
    }

    // Update rpcUrl in input if needed
    const inputWithRpcUrl = {
        ...addLiquidityInput,
        rpcUrl: fork.rpcUrl,
    };

    return await addLiquidity.query(inputWithRpcUrl, poolState);
}
