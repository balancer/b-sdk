import { Address, TestActions } from 'viem';
import {
    ChainId,
    AddLiquidityNested,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutputV3,
    AddLiquidityNestedBuildCallOutput,
    Slippage,
    PublicWalletClient,
    Permit2,
    NestedPoolState,
} from '@/index';
import {
    hasSavedTestData,
    deserializePermit2,
    serializeNestedQueryOutput,
    SavedAddLiquidityNestedTestData,
} from './addLiquidityTestDataHelpers';
import { getNestedTestData, setNestedTestData } from './addLiquidityTestDataAccess';
import { loadNestedQueryOutput } from './addLiquidityNestedQueryHelpers';
import {
    buildAndSerializeNestedCall,
    buildAndSerializeNestedCallWithPermit2,
} from './addLiquidityNestedBuildHelpers';
import {
    assertAddLiquidityNestedResultWithForkTest,
    assertAddLiquidityNestedResultWithSavedData,
} from './addLiquidityNestedAssertHelpers';

/**
 * Configuration for running a nested add liquidity test.
 */
export type TestAddLiquidityNestedConfig = {
    chainId: ChainId;
    nestedPoolState: NestedPoolState;
    addLiquidityNestedInput: AddLiquidityNestedInput;
    wethIsEth: boolean;
    fork?: { rpcUrl: string };
    contractToCall: Address;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    slippage: Slippage;
    testName: string;
    context: string;
};

/**
 * Core nested add liquidity test execution logic shared between direct and permit2 tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 * @param permit2ToUse - Optional Permit2 signature to use for building the call
 */
async function executeAddLiquidityNestedTestCore(
    config: TestAddLiquidityNestedConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2ToUse?: Permit2,
): Promise<void> {
    const {
        chainId,
        nestedPoolState,
        addLiquidityNestedInput,
        wethIsEth,
        fork,
        client,
        testAddress,
        slippage,
        testName,
        context,
    } = config;

    const addLiquidityNested = new AddLiquidityNested();

    const savedData = getNestedTestData(
        savedAddLiquidityTestData,
        testName,
        context,
    );

    // Load query output (from saved data or by querying)
    const queryOutput = await loadNestedQueryOutput(
        savedData,
        addLiquidityNested,
        addLiquidityNestedInput,
        nestedPoolState,
        fork,
    );

    // Build and serialize call (use permit2 variant if permit2 is provided)
    const { call, serializedCall } = permit2ToUse
        ? buildAndSerializeNestedCallWithPermit2(
              addLiquidityNested,
              queryOutput,
              slippage,
              permit2ToUse,
              wethIsEth,
          )
        : buildAndSerializeNestedCall(
              addLiquidityNested,
              queryOutput,
              slippage,
              wethIsEth,
          );

    if (hasSavedTestData(savedData)) {
        assertAddLiquidityNestedResultWithSavedData(call, savedData);
        return;
    }

    // Assert or compare results
    await assertAddLiquidityNestedResultWithForkTest({
        addLiquidityNestedInput,
        nestedPoolState,
        client,
        testAddress,
        call,
        queryOutput,
        wethIsEth,
    });

    // Save both query output and call data for new tests
    // Include permit2 if context is "permit2 signature approval"
    const PERMIT2_SIGNATURE_CONTEXT = 'permit2 signature approval';
    setNestedTestData(
        addLiquidityTestData,
        testName,
        context,
        {
            queryOutput: serializeNestedQueryOutput(queryOutput),
            call: serializedCall,
        },
        context === PERMIT2_SIGNATURE_CONTEXT ? permit2ToUse : undefined,
    );
}

/**
 * Executes a nested add liquidity test by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 */
export async function runAddLiquidityNestedTest(
    config: TestAddLiquidityNestedConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
): Promise<void> {
    return executeAddLiquidityNestedTestCore(
        config,
        savedAddLiquidityTestData,
        addLiquidityTestData,
    );
}

/**
 * Executes a nested add liquidity test with Permit2 signature by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 * @param permit2 - Optional Permit2 signature. Required when building new calls, optional when using saved data.
 */
export async function runAddLiquidityNestedTestWithSignature(
    config: TestAddLiquidityNestedConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2?: Permit2,
): Promise<void> {
    const { testName, context } = config;

    const savedData = getNestedTestData(
        savedAddLiquidityTestData,
        testName,
        context,
    );

    // Load permit2 from saved data if we have saved data but no permit2 parameter
    // For permit2 signature approval tests, we always need permit2 (either from parameter or saved data)
    let permit2ToUse = permit2;
    if (!permit2ToUse && hasSavedTestData(savedData)) {
        // TypeScript narrows savedData to SavedAddLiquidityNestedTestData after hasSavedTestData check
        const savedDataTyped = savedData as SavedAddLiquidityNestedTestData;
        if (savedDataTyped.permit2) {
            permit2ToUse = deserializePermit2(savedDataTyped.permit2);
        }
    }

    // If we don't have saved data, permit2 is required
    if (!permit2ToUse) {
        throw new Error(
            `Cannot build call with permit2 for test "${testName}" in context "${context}": permit2 is required when no saved test data is available. Either provide a permit2 parameter or ensure saved test data exists.`,
        );
    }

    return executeAddLiquidityNestedTestCore(
        config,
        savedAddLiquidityTestData,
        addLiquidityTestData,
        permit2ToUse,
    );
}

