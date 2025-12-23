import {
    AddLiquidityNested,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutputV3,
    NestedPoolState,
} from '@/index';
import {
    hasSavedTestData,
    deserializeNestedQueryOutput,
} from './addLiquidityTestDataHelpers';
import { getNestedTestData } from './addLiquidityTestDataAccess';

/**
 * Loads nested query output from saved data or by querying the SDK.
 * @param savedData - Saved test data (may be undefined)
 * @param addLiquidityNested - AddLiquidityNested instance
 * @param addLiquidityNestedInput - Input for querying
 * @param nestedPoolState - The nested pool state
 * @param fork - Fork RPC URL (optional, only needed if querying)
 * @returns Query output (from saved data or fresh query)
 */
export async function loadNestedQueryOutput(
    savedData: unknown,
    addLiquidityNested: AddLiquidityNested,
    addLiquidityNestedInput: AddLiquidityNestedInput,
    nestedPoolState: NestedPoolState,
    fork?: { rpcUrl: string },
): Promise<AddLiquidityNestedQueryOutputV3> {
    // If we have saved data, deserialize and return it
    if (hasSavedTestData(savedData)) {
        const savedDataTyped = savedData as { queryOutput: unknown };
        return deserializeNestedQueryOutput(savedDataTyped.queryOutput);
    }

    // Otherwise, query the SDK
    if (!fork) {
        throw new Error(
            'Cannot query nested add liquidity: no saved data and no fork RPC URL provided',
        );
    }

    const queryOutput = (await addLiquidityNested.query(
        addLiquidityNestedInput,
        nestedPoolState,
    )) as AddLiquidityNestedQueryOutputV3;

    return queryOutput;
}

