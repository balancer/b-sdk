import {
    AddLiquidityBoostedV3,
    AddLiquidityBoostedInput,
    AddLiquidityBoostedQueryOutput,
    PoolStateWithUnderlyings,
} from '@/index';
import {
    deserializeBoostedQueryOutput,
    hasSavedTestData,
} from './addLiquidityTestDataHelpers';

/**
 * Loads boosted query output from saved test data or by querying the add liquidity boosted.
 * If saved data exists, it uses that. Otherwise, it queries fresh data from the fork.
 * @param savedData - Saved test data (may be undefined)
 * @param addLiquidityBoosted - The AddLiquidityBoostedV3 instance to query if no saved data exists
 * @param addLiquidityBoostedInput - The add liquidity boosted input
 * @param boostedPoolState - The boosted pool state
 * @param fork - Fork RPC URL (required if no saved data)
 * @returns The query output
 * @throws Error if fork is not available when needed
 */
export async function loadBoostedQueryOutput(
    savedData: unknown,
    addLiquidityBoosted: AddLiquidityBoostedV3,
    addLiquidityBoostedInput: AddLiquidityBoostedInput,
    boostedPoolState: PoolStateWithUnderlyings,
    fork: { rpcUrl: string } | undefined,
): Promise<AddLiquidityBoostedQueryOutput> {
    const hasSavedData = hasSavedTestData(savedData);

    if (hasSavedData) {
        // Use saved query output (skip addLiquidityBoosted.query() call)
        const savedQueryOutput = savedData.queryOutput;
        return deserializeBoostedQueryOutput(savedQueryOutput);
    }

    // Query fresh data - fork must be available
    if (!fork) {
        throw new Error(
            'Cannot query add liquidity boosted: fork not initialized and no saved test data available. ' +
                'Either initialize a fork or ensure saved test data exists for this test case.',
        );
    }

    // Update rpcUrl in input if needed
    const inputWithRpcUrl = {
        ...addLiquidityBoostedInput,
        rpcUrl: fork.rpcUrl,
    };

    return await addLiquidityBoosted.query(inputWithRpcUrl, boostedPoolState);
}

