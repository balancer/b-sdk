import { Address, TestActions } from 'viem';
import {
    ChainId,
    AddLiquidity,
    AddLiquidityInput,
    AddLiquidityQueryOutput,
    AddLiquidityBuildCallOutput,
    Slippage,
    PublicWalletClient,
    Permit2,
    PoolState,
    AddLiquidityKind,
} from '@/index';
import { loadQueryOutput } from './addLiquidityQueryHelpers';
import {
    buildAndSerializeCall,
    buildAndSerializeCallWithPermit2,
} from './addLiquidityBuildHelpers';
import {
    assertAddLiquidityResultWithForkTest,
    assertAddLiquidityResultWithSavedData,
} from './addLiquidityAssertHelpers';
import { getTestData, setTestData } from './addLiquidityTestDataAccess';
import {
    hasSavedTestData,
    deserializePermit2,
    serializeQueryOutput,
    SavedAddLiquidityTestData,
} from './addLiquidityTestDataHelpers';

/**
 * Configuration for running an add liquidity test.
 */
export type TestAddLiquidityConfig = {
    chainId: ChainId;
    poolState: PoolState;
    addLiquidityInput: AddLiquidityInput;
    wethIsEth: boolean;
    fork?: { rpcUrl: string };
    contractToCall: Address;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    slippage: Slippage;
    testName: string;
    context: string;
    subContext?: string;
    addLiquidityKind: AddLiquidityKind;
    proportionalType?: 'bptOut' | 'amountIn';
};

/**
 * Core add liquidity test execution logic shared between regular and permit2 tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 * @param permit2ToUse - Optional Permit2 signature to use for building the call
 */
async function executeAddLiquidityTestCore(
    config: TestAddLiquidityConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2ToUse?: Permit2,
): Promise<void> {
    const {
        chainId,
        poolState,
        addLiquidityInput,
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

    const addLiquidity = new AddLiquidity();

    const savedData = getTestData(
        savedAddLiquidityTestData,
        testName,
        context,
        addLiquidityKind,
        proportionalType,
    );

    // Load query output (from saved data or by querying)
    const queryOutput = await loadQueryOutput(
        savedData,
        addLiquidity,
        addLiquidityInput,
        poolState,
        fork,
    );

    // Build and serialize call (use permit2 variant if permit2 is provided)
    // Note: Permit2 is only supported for V3
    const { call, serializedCall } = permit2ToUse
        ? buildAndSerializeCallWithPermit2(
              addLiquidity,
              queryOutput,
              slippage,
              wethIsEth,
              permit2ToUse,
              addLiquidityInput.userData,
          )
        : buildAndSerializeCall(
              addLiquidity,
              queryOutput,
              slippage,
              wethIsEth,
              addLiquidityInput.userData,
              queryOutput.protocolVersion === 2 ? testAddress : undefined,
          );

    if (hasSavedTestData(savedData)) {
        assertAddLiquidityResultWithSavedData(call, savedData);
        return;
    }

    // Assert or compare results
    await assertAddLiquidityResultWithForkTest({
        addLiquidityInput,
        poolState,
        chainId,
        client,
        testAddress,
        call,
        queryOutput,
        slippage,
        wethIsEth,
    });

    // Save both query output and call data for new tests
    // Include permit2 if context is "permit2 signature approval"
    const PERMIT2_SIGNATURE_CONTEXT = 'permit2 signature approval';
    setTestData(
        addLiquidityTestData,
        testName,
        context,
        addLiquidityKind,
        proportionalType,
        {
            queryOutput: serializeQueryOutput(queryOutput),
            call: serializedCall,
        },
        context === PERMIT2_SIGNATURE_CONTEXT ? permit2ToUse : undefined,
    );
}

/**
 * Executes an add liquidity test by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 */
export async function runAddLiquidityTest(
    config: TestAddLiquidityConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
): Promise<void> {
    return executeAddLiquidityTestCore(
        config,
        savedAddLiquidityTestData,
        addLiquidityTestData,
    );
}

/**
 * Executes an add liquidity test with Permit2 signature by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedAddLiquidityTestData - Saved test data from file
 * @param addLiquidityTestData - Test data object to update with new results
 * @param permit2 - Optional Permit2 signature. Required when building new calls, optional when using saved data.
 */
export async function runAddLiquidityTestWithSignature(
    config: TestAddLiquidityConfig,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2?: Permit2,
): Promise<void> {
    const { testName, context, addLiquidityKind, proportionalType } = config;

    const savedData = getTestData(
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
        // TypeScript narrows savedData to SavedAddLiquidityTestData after hasSavedTestData check
        const savedDataTyped = savedData as SavedAddLiquidityTestData;
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

    return executeAddLiquidityTestCore(
        config,
        savedAddLiquidityTestData,
        addLiquidityTestData,
        permit2ToUse,
    );
}
