import { Address, TestActions } from 'viem';
import {
    ChainId,
    AddLiquidityBoostedV3,
    AddLiquidityBoostedInput,
    Slippage,
    PublicWalletClient,
    Permit2,
    PoolStateWithUnderlyings,
    AddLiquidityKind,
} from '@/index';
import {
    hasSavedTestData,
    deserializePermit2,
    serializeBoostedQueryOutput,
    SavedAddLiquidityBoostedTestData,
} from './addLiquidityTestDataHelpers';
import {
    getBoostedTestData,
    setBoostedTestData,
} from './addLiquidityTestDataAccess';
import { loadBoostedQueryOutput } from './addLiquidityBoostedQueryHelpers';
import {
    buildAndSerializeBoostedCall,
    buildAndSerializeBoostedCallWithPermit2,
} from './addLiquidityBoostedBuildHelpers';
import {
    assertAddLiquidityBoostedResultWithForkTest,
    assertAddLiquidityBoostedResultWithSavedData,
} from './addLiquidityBoostedAssertHelpers';

/**
 * Configuration for running a boosted add liquidity test.
 */
export type TestAddLiquidityBoostedConfig = {
    chainId: ChainId;
    boostedPoolState: PoolStateWithUnderlyings;
    addLiquidityBoostedInput: AddLiquidityBoostedInput;
    wethIsEth: boolean;
    fork?: { rpcUrl: string };
    contractToCall: Address;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    slippage: Slippage;
    testName: string;
    context: string;
    addLiquidityKind: AddLiquidityKind;
    proportionalType?: 'bptOut' | 'amountIn';
};

/**
 * Core boosted add liquidity test execution logic shared between direct and permit2 tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 * @param permit2ToUse - Optional Permit2 signature to use for building the call
 */
async function executeAddLiquidityBoostedTestCore(
    config: TestAddLiquidityBoostedConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2ToUse?: Permit2,
): Promise<void> {
    const {
        boostedPoolState,
        addLiquidityBoostedInput,
        wethIsEth,
        fork,
        client,
        testAddress,
        slippage,
        testName,
        context,
        addLiquidityKind,
        proportionalType,
    } = config;

    const addLiquidityBoosted = new AddLiquidityBoostedV3();

    const savedData = getBoostedTestData(
        savedAddLiquidityTestData,
        testName,
        context,
        addLiquidityKind,
        proportionalType,
    );

    // Load query output (from saved data or by querying)
    const queryOutput = await loadBoostedQueryOutput(
        savedData,
        addLiquidityBoosted,
        addLiquidityBoostedInput,
        boostedPoolState,
        fork,
    );

    // Build and serialize call (use permit2 variant if permit2 is provided)
    const { call, serializedCall } = permit2ToUse
        ? buildAndSerializeBoostedCallWithPermit2(
              addLiquidityBoosted,
              queryOutput,
              slippage,
              wethIsEth,
              permit2ToUse,
          )
        : buildAndSerializeBoostedCall(
              addLiquidityBoosted,
              queryOutput,
              slippage,
              wethIsEth,
          );

    if (hasSavedTestData(savedData)) {
        assertAddLiquidityBoostedResultWithSavedData(call, savedData);
        return;
    }

    // Assert or compare results
    await assertAddLiquidityBoostedResultWithForkTest({
        addLiquidityBoostedInput,
        client,
        testAddress,
        call,
        queryOutput,
        wethIsEth,
    });

    // Save both query output and call data for new tests
    // Include permit2 if context is "permit2 signature approval"
    const PERMIT2_SIGNATURE_CONTEXT = 'permit2 signature approval';
    setBoostedTestData(
        addLiquidityTestData,
        testName,
        context,
        addLiquidityKind,
        proportionalType,
        {
            queryOutput: serializeBoostedQueryOutput(queryOutput),
            call: serializedCall,
        },
        context === PERMIT2_SIGNATURE_CONTEXT ? permit2ToUse : undefined,
    );
}

/**
 * Executes a boosted add liquidity test by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 */
export async function runAddLiquidityBoostedTest(
    config: TestAddLiquidityBoostedConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
): Promise<void> {
    return executeAddLiquidityBoostedTestCore(
        config,
        savedAddLiquidityTestData,
        addLiquidityTestData,
    );
}

/**
 * Executes a boosted add liquidity test with Permit2 signature by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 * @param permit2 - Optional Permit2 signature. Required when building new calls, optional when using saved data.
 */
export async function runAddLiquidityBoostedTestWithSignature(
    config: TestAddLiquidityBoostedConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2?: Permit2,
): Promise<void> {
    const { testName, context, addLiquidityKind, proportionalType } = config;

    const savedData = getBoostedTestData(
        savedAddLiquidityTestData,
        testName,
        context,
        addLiquidityKind,
        proportionalType,
    );

    // Load permit2 from saved data if we have saved data but no permit2 parameter
    // For permit2 signature approval tests, we always need permit2 (either from parameter or saved data)
    let permit2ToUse = permit2;
    if (!permit2ToUse && hasSavedTestData(savedData)) {
        // TypeScript narrows savedData to SavedAddLiquidityBoostedTestData after hasSavedTestData check
        const savedDataTyped = savedData as SavedAddLiquidityBoostedTestData;
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

    return executeAddLiquidityBoostedTestCore(
        config,
        savedAddLiquidityTestData,
        addLiquidityTestData,
        permit2ToUse,
    );
}
