import { Address, TestActions } from 'viem';
import {
    ChainId,
    Path,
    SwapKind,
    Swap,
    Slippage,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    PublicWalletClient,
    Permit2,
} from '@/index';
import { loadQueryOutput } from './swapQueryHelpers';
import {
    buildAndSerializeCall,
    buildAndSerializeCallWithPermit2,
} from './swapBuildHelpers';
import {
    assertSwapResultWithForkTest,
    assertSwapResultWithSavedData,
} from './swapAssertHelpers';
import { getTestData, setTestData } from './swapTestDataAccess';
import {
    hasSavedTestData,
    deserializePermit2,
    serializeQueryOutput,
} from './swapTestDataHelpers';
import { TEST_CONSTANTS } from '../../entities/swaps/v3/swapTestConfig';

/**
 * Configuration for running a swap test.
 */
export type TestSwapConfig = {
    chainId: ChainId;
    path: Path;
    swapKind: SwapKind;
    wethIsEth: boolean;
    fork?: { rpcUrl: string };
    routerAddress: Address;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    slippage: Slippage;
    deadline: bigint;
    testName: string;
    context: string;
    subContext?: string;
    outputTest?: {
        testExactOutAmount: boolean;
        percentage: number;
    };
};

/**
 * Core swap test execution logic shared between regular and permit2 tests.
 * @param config - Test configuration
 * @param savedSwapTestData - Saved test data from file
 * @param swapTestData - Test data object to update with new results
 * @param permit2ToUse - Optional Permit2 signature to use for building the call
 */
async function executeSwapTestCore(
    config: TestSwapConfig,
    savedSwapTestData: Record<string, unknown>,
    swapTestData: Record<string, unknown>,
    permit2ToUse?: Permit2,
): Promise<void> {
    const {
        chainId,
        path,
        swapKind,
        wethIsEth,
        fork,
        routerAddress,
        client,
        testAddress,
        slippage,
        deadline,
        testName,
        context,
        subContext,
        outputTest = TEST_CONSTANTS.defaultOutputTest,
    } = config;

    const swap = new Swap({
        chainId,
        paths: [path],
        swapKind,
    });

    const savedData = getTestData(
        savedSwapTestData,
        testName,
        context,
        subContext,
        swapKind,
    );

    // Load query output (from saved data or by querying)
    const queryOutput =
        swapKind === SwapKind.GivenIn
            ? await loadQueryOutput<ExactInQueryOutput>(
                  savedData,
                  swap,
                  fork,
                  SwapKind.GivenIn,
              )
            : await loadQueryOutput<ExactOutQueryOutput>(
                  savedData,
                  swap,
                  fork,
                  SwapKind.GivenOut,
              );

    // Build and serialize call (use permit2 variant if permit2 is provided)
    const { call, serializedCall } = permit2ToUse
        ? buildAndSerializeCallWithPermit2(
              swap,
              queryOutput,
              slippage,
              deadline,
              wethIsEth,
              permit2ToUse,
          )
        : buildAndSerializeCall(
              swap,
              queryOutput,
              slippage,
              deadline,
              wethIsEth,
          );

    if (hasSavedTestData(savedData)) {
        assertSwapResultWithSavedData(call, savedData);
        return;
    }

    // Assert or compare results
    await assertSwapResultWithForkTest({
        swap,
        chainId,
        routerAddress,
        client,
        testAddress,
        call,
        queryOutput,
        swapKind,
        wethIsEth,
        outputTest,
    });

    // Save both query output and call data for new tests
    // Include permit2 if context is "permit2 signature approval"
    setTestData(
        swapTestData,
        testName,
        context,
        subContext,
        swapKind,
        {
            queryOutput: serializeQueryOutput(queryOutput),
            call: serializedCall,
        },
        context === 'permit2 signature approval' ? permit2ToUse : undefined,
    );
}

/**
 * Executes a swap test by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedSwapTestData - Saved test data from file
 * @param swapTestData - Test data object to update with new results
 */
export async function runSwapTest(
    config: TestSwapConfig,
    savedSwapTestData: Record<string, unknown>,
    swapTestData: Record<string, unknown>,
): Promise<void> {
    return executeSwapTestCore(
        config,
        savedSwapTestData,
        swapTestData,
        undefined,
    );
}

/**
 * Executes a swap test with Permit2 signature by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 * @param savedSwapTestData - Saved test data from file
 * @param swapTestData - Test data object to update with new results
 * @param permit2 - Optional Permit2 signature. Required when building new calls, optional when using saved data.
 */
export async function runSwapTestWithSignature(
    config: TestSwapConfig,
    savedSwapTestData: Record<string, unknown>,
    swapTestData: Record<string, unknown>,
    permit2?: Permit2,
): Promise<void> {
    const { testName, context, subContext, swapKind } = config;

    const savedData = getTestData(
        savedSwapTestData,
        testName,
        context,
        subContext,
        swapKind,
    );

    // Load permit2 from saved data if we have saved data but no permit2 parameter
    let permit2ToUse = permit2;
    if (!permit2 && hasSavedTestData(savedData) && savedData.permit2) {
        permit2ToUse = deserializePermit2(savedData.permit2);
    }

    // If we don't have saved data, permit2 is required
    if (!permit2ToUse) {
        throw new Error(
            'Cannot build call with permit2: permit2 is required when no saved test data is available',
        );
    }

    return executeSwapTestCore(
        config,
        savedSwapTestData,
        swapTestData,
        permit2ToUse,
    );
}
