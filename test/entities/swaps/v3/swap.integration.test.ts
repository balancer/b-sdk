// pnpm test ./test/entities/swaps/v3/swap.integration.test.ts
import { config } from 'dotenv';
config();
import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    TestActions,
    Hex,
} from 'viem';
import {
    CHAINS,
    ChainId,
    Path,
    SwapKind,
    Swap,
    PERMIT2,
    PublicWalletClient,
    AddressProvider,
    Slippage,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    ExactOutQueryOutput,
    ExactInQueryOutput,
    MAX_UINT256,
} from '@/index';

import {
    ANVIL_NETWORKS,
    NetworkSetup,
    startFork,
    stopAnvilFork,
} from 'test/anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import {
    approveSpenderOnPermit2,
    approveSpenderOnTokens,
    findTokenBalanceSlot,
    setTokenBalances,
} from 'test/lib/utils/helper';
import {
    assertResultExactIn,
    assertResultExactOut,
    serializeQueryOutput,
    deserializeQueryOutput,
    serializeCallData,
    loadSwapTestData,
    saveSwapTestData,
    allTestsHaveSavedData,
    hasSavedTestData,
} from 'test/lib/utils';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

// Get the directory of the current test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const swapTestDataPath = join(__dirname, 'swapTestData.json');
const jobId =
    basename(__filename)
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) % 10000;

// Load existing test data (if file exists)
const savedSwapTestData = loadSwapTestData(swapTestDataPath);

// Data collection for swap test call data (nested structure)
const swapTestData: Record<string, unknown> = {};

// Test configuration constants
const TEST_CONSTANTS = {
    ANVIL_TEST_ADDRESS: '0x831eFb058FEdCd16Cd6b9174206DFe452dDCe8C3', // address from mnemonic "you twelve word test phrase boat cat like this example dog car"
    BALANCE_MULTIPLIER: 10n, // For setting token balances
    slippage: Slippage.fromPercentage('0.1'),
    deadline: 999999999999999999n,
    defaultOutputTest: {
        testExactOutAmount: true,
        percentage: 0,
    },
    defaultInputTest: {
        testExactInAmount: true,
        percentage: 0,
    },
} as const;

type NativePosition = 'input' | 'output' | 'none';

type Test = {
    name: string;
    chainId: ChainId;
    anvilNetwork: NetworkSetup;
    path: Path;
    isNative: NativePosition;
};

const tests: Test[] = [
    {
        name: 'Single Swap - WETH>USDC',
        chainId: ChainId.BASE,
        anvilNetwork: ANVIL_NETWORKS.BASE,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.BASE].WETH.address,
                    decimals: TOKENS[ChainId.BASE].WETH.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].USDC.address,
                    decimals: TOKENS[ChainId.BASE].USDC.decimals,
                },
            ],
            pools: ['0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7'], // https://balancer.fi/pools/base/v3/0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7
            inputAmountRaw: 10000000000000000n,
            outputAmountRaw: 100000000n,
        },
        isNative: 'input',
    },
    {
        name: 'Single Swap - USDC>WETH',
        chainId: ChainId.BASE,
        anvilNetwork: ANVIL_NETWORKS.BASE,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.BASE].USDC.address,
                    decimals: TOKENS[ChainId.BASE].USDC.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].WETH.address,
                    decimals: TOKENS[ChainId.BASE].WETH.decimals,
                },
            ],
            pools: ['0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7'],
            inputAmountRaw: 1000000000n,
            outputAmountRaw: 100000000000000000n,
        },
        isNative: 'output',
    },
    {
        name: 'Single Swap - NOT NATIVE',
        chainId: ChainId.BASE,
        anvilNetwork: ANVIL_NETWORKS.BASE,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.BASE].USDC.address,
                    decimals: TOKENS[ChainId.BASE].USDC.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].WETH.address,
                    decimals: TOKENS[ChainId.BASE].WETH.decimals,
                },
            ],
            pools: ['0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7'],
            inputAmountRaw: 1000000000n,
            outputAmountRaw: 100000000000000000n,
        },
        isNative: 'none',
    },
];
// ============================================================================
// Tests
// ============================================================================

for (const test of tests) {
    describe.sequential(test.name, () => {
        let snapshotPreApprove: Hex | undefined;
        let fork: { rpcUrl: string } | undefined;
        let client: (PublicWalletClient & TestActions) | undefined;
        const testAddress = TEST_CONSTANTS.ANVIL_TEST_ADDRESS;
        const routerAddress =
            test.path.pools.length > 1
                ? AddressProvider.BatchRouter(test.chainId)
                : AddressProvider.Router(test.chainId);

        beforeAll(async () => {
            // Only run fork/client setup if at least one test doesn't have saved data
            if (!allTestsHaveSavedData(test, savedSwapTestData)) {
                const setup = await setupForkAndClient(test);
                fork = setup.fork;
                client = setup.client;
                snapshotPreApprove = setup.snapshotPreApprove;
            }
        });
        if (test.isNative === 'input') {
            describe.sequential('native input', () => {
                it('should handle GivenIn swap', async () => {
                    await testSwap({
                        chainId: test.chainId,
                        path: test.path,
                        swapKind: SwapKind.GivenIn,
                        wethIsEth: true,
                        fork,
                        routerAddress,
                        client,
                        testAddress,
                        slippage: TEST_CONSTANTS.slippage,
                        deadline: TEST_CONSTANTS.deadline,
                        testName: test.name,
                        context: 'native input',
                        subContext: undefined,
                    });
                });
                it('should handle GivenOut swap', async () => {
                    await testSwap({
                        chainId: test.chainId,
                        path: test.path,
                        swapKind: SwapKind.GivenOut,
                        wethIsEth: true,
                        fork,
                        routerAddress,
                        client,
                        testAddress,
                        slippage: TEST_CONSTANTS.slippage,
                        deadline: TEST_CONSTANTS.deadline,
                        testName: test.name,
                        context: 'native input',
                        subContext: undefined,
                    });
                });
            });
        }
        describe.sequential('permit2 direct approval', () => {
            beforeAll(async () => {
                // Only run if fork/client were initialized
                if (client && fork && snapshotPreApprove) {
                    snapshotPreApprove = await setupPermit2Approval(
                        client,
                        testAddress,
                        test.path,
                        routerAddress,
                        snapshotPreApprove,
                    );
                }
            });

            if (test.isNative === 'output') {
                describe.sequential('native output', () => {
                    it('should handle GivenIn swap', async () => {
                        await testSwap({
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenIn,
                            wethIsEth: true,
                            fork,
                            routerAddress,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'permit2 direct approval',
                            subContext: 'native output',
                        });
                    });
                    it('should handle GivenOut swap', async () => {
                        await testSwap({
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenOut,
                            wethIsEth: true,
                            fork,
                            routerAddress,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'permit2 direct approval',
                            subContext: 'native output',
                        });
                    });
                });
            }

            describe.sequential('token output', () => {
                it('should handle GivenIn swap', async () => {
                    await testSwap({
                        chainId: test.chainId,
                        path: test.path,
                        swapKind: SwapKind.GivenIn,
                        wethIsEth: false,
                        fork,
                        routerAddress,
                        client,
                        testAddress,
                        slippage: TEST_CONSTANTS.slippage,
                        deadline: TEST_CONSTANTS.deadline,
                        testName: test.name,
                        context: 'permit2 direct approval',
                        subContext: 'token output',
                    });
                });

                it('should handle GivenOut swap', async () => {
                    await testSwap({
                        chainId: test.chainId,
                        path: test.path,
                        swapKind: SwapKind.GivenOut,
                        wethIsEth: false,
                        fork,
                        routerAddress,
                        client,
                        testAddress,
                        slippage: TEST_CONSTANTS.slippage,
                        deadline: TEST_CONSTANTS.deadline,
                        testName: test.name,
                        context: 'permit2 direct approval',
                        subContext: 'token output',
                    });
                });
            });
        });
        afterAll(async () => {
            // Only stop fork if it was started
            if (fork) {
                console.log('stopFork', test.name);
                await stopAnvilFork(test.anvilNetwork, jobId);
            }
        });
    });
}

// Write swap test data to JSON file after all tests complete
afterAll(async () => {
    await saveSwapTestData(swapTestDataPath, savedSwapTestData, swapTestData);
});

// ============================================================================
// Helper Functions
// ============================================================================

// ----------------------------------------------------------------------------
// Test Data Access Helpers
// ----------------------------------------------------------------------------

/**
 * Gets test data from the nested structure.
 * @param savedData - The saved test data (nested structure)
 * @param testName - Name of the test case
 * @param context - Test context (e.g., 'native input', 'permit2 direct approval')
 * @param subContext - Optional sub-context (e.g., 'native output', 'token output')
 * @param swapKind - The swap kind being tested
 * @returns The test data if found, undefined otherwise
 */
function getTestData(
    savedData: Record<string, unknown>,
    testName: string,
    context: string,
    subContext: string | undefined,
    swapKind: SwapKind,
): unknown {
    const testData = savedData[testName];
    if (!testData || typeof testData !== 'object') {
        return undefined;
    }

    const testDataObj = testData as Record<string, unknown>;
    const contextData = testDataObj[context];
    if (!contextData || typeof contextData !== 'object') {
        return undefined;
    }

    const contextDataObj = contextData as Record<string, unknown>;

    // If subContext is provided, navigate to it
    if (subContext) {
        const subContextData = contextDataObj[subContext];
        if (!subContextData || typeof subContextData !== 'object') {
            return undefined;
        }
        const subContextDataObj = subContextData as Record<string, unknown>;
        const swapKindKey =
            swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut';
        return subContextDataObj[swapKindKey];
    }

    // No subContext, swapKind is directly under context
    const swapKindKey = swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut';
    return contextDataObj[swapKindKey];
}

/**
 * Sets test data in the nested structure.
 * @param testData - The test data object to update
 * @param testName - Name of the test case
 * @param context - Test context (e.g., 'native input', 'permit2 direct approval')
 * @param subContext - Optional sub-context (e.g., 'native output', 'token output')
 * @param swapKind - The swap kind being tested
 * @param data - The data to save
 */
function setTestData(
    testData: Record<string, unknown>,
    testName: string,
    context: string,
    subContext: string | undefined,
    swapKind: SwapKind,
    data: { queryOutput: unknown; call: unknown },
): void {
    if (!testData[testName]) {
        testData[testName] = {};
    }
    const testDataObj = testData[testName] as Record<string, unknown>;

    if (!testDataObj[context]) {
        testDataObj[context] = {};
    }
    const contextDataObj = testDataObj[context] as Record<string, unknown>;

    const swapKindKey = swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut';

    if (subContext) {
        if (!contextDataObj[subContext]) {
            contextDataObj[subContext] = {};
        }
        const subContextDataObj = contextDataObj[subContext] as Record<
            string,
            unknown
        >;
        subContextDataObj[swapKindKey] = data;
    } else {
        contextDataObj[swapKindKey] = data;
    }
}

// ----------------------------------------------------------------------------
// Setup Helpers
// ----------------------------------------------------------------------------

/**
 * Sets up the fork and test client for integration tests.
 * Configures token approvals for Permit2 and creates a snapshot for test isolation.
 * @param test - The test configuration
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
async function setupForkAndClient(test: Test): Promise<{
    fork: { rpcUrl: string };
    client: PublicWalletClient & TestActions;
    snapshotPreApprove: Hex;
}> {
    const fork = await startFork(test.anvilNetwork, jobId);
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[test.chainId],
        transport: http(fork.rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const testAddressCheck = (await client.getAddresses())[0];
    if (testAddressCheck !== TEST_CONSTANTS.ANVIL_TEST_ADDRESS) {
        throw Error('Test address mismatch');
    }

    // First step of permit2 flow - user approves Permit2 contract to spend input token
    await approveSpenderOnTokens(
        client,
        TEST_CONSTANTS.ANVIL_TEST_ADDRESS,
        [test.path.tokens[0].address],
        PERMIT2[test.chainId],
        [MAX_UINT256],
    );

    // Uses Special RPC methods to revert state back to same snapshot for each test
    // https://github.com/trufflesuite/ganache-cli-archive/blob/master/README.md
    const snapshotPreApprove = await client.snapshot();

    return { fork, client, snapshotPreApprove };
}

/**
 * Sets up Permit2 approval for the router.
 * Reverts to pre-approval snapshot, sets token balances, and approves router via Permit2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param path - The swap path
 * @param routerAddress - Address of the router contract
 * @param snapshotPreApprove - Snapshot ID before permit2 approval
 * @returns New snapshot ID after permit2 approval setup
 */
async function setupPermit2Approval(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    path: Path,
    routerAddress: Address,
    snapshotPreApprove: Hex,
): Promise<Hex> {
    // Revert to pre-approval snapshot
    await client.revert({
        id: snapshotPreApprove,
    });
    const newSnapshot = await client.snapshot();

    const slot = await findTokenBalanceSlot(
        client,
        testAddress,
        path.tokens[0].address,
    );

    await setTokenBalances(
        client,
        testAddress,
        [path.tokens[0].address],
        [slot],
        [path.inputAmountRaw * TEST_CONSTANTS.BALANCE_MULTIPLIER],
    );

    // Second step of permit2 flow - user Permit2 approves router to spend input token
    await approveSpenderOnPermit2(
        client,
        testAddress,
        path.tokens[0].address,
        routerAddress,
    );

    return newSnapshot;
}

// ----------------------------------------------------------------------------
// Query/Load Helpers
// ----------------------------------------------------------------------------

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
async function loadQueryOutput<
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

// ----------------------------------------------------------------------------
// Build/Serialize Helpers
// ----------------------------------------------------------------------------

/**
 * Builds swap call data and serializes it for comparison/saving.
 * @param swap - The Swap instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param deadline - Transaction deadline
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @returns The built call and its serialized form
 */
function buildAndSerializeCall(
    swap: Swap,
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput,
    slippage: Slippage,
    deadline: bigint,
    wethIsEth: boolean,
): {
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    serializedCall: unknown;
} {
    const call = swap.buildCall({
        slippage,
        deadline,
        queryOutput,
        wethIsEth,
    });

    const serializedCall = serializeCallData(call);

    return { call, serializedCall };
}

// ----------------------------------------------------------------------------
// Assert/Compare Helpers
// ----------------------------------------------------------------------------

/**
 * Asserts or compares swap test results.
 * If saved data exists, compares the serialized call data.
 * Otherwise, runs full integration assertions and saves the results.
 * @param params - Configuration for assertion/comparison
 * @throws Error if client is not available when needed for integration tests
 */
async function assertOrCompareSwapResult({
    hasSavedData,
    serializedCall,
    savedData,
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
    inputTest,
    testName,
    context,
    subContext,
}: {
    hasSavedData: boolean;
    serializedCall: unknown;
    savedData: unknown;
    swap: Swap;
    chainId: ChainId;
    routerAddress: Address;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput;
    swapKind: SwapKind;
    wethIsEth: boolean;
    outputTest?: {
        testExactOutAmount: boolean;
        percentage: number;
    };
    inputTest?: {
        testExactInAmount: boolean;
        percentage: number;
    };
    testName: string;
    context: string;
    subContext: string | undefined;
}): Promise<void> {
    if (hasSavedData && hasSavedTestData(savedData)) {
        // Compare with saved call data
        // TypeScript now knows savedData is SavedSwapTestData after type guard
        expect(serializedCall).to.deep.equal(savedData.call);
    } else {
        // Run full integration assertions - client must be available
        if (!client) {
            throw new Error(
                'Cannot run integration assertions: client not initialized and no saved test data available',
            );
        }
        if (swapKind === SwapKind.GivenIn) {
            await assertResultExactIn({
                wethIsEth,
                swap,
                chainId,
                contractToCall: routerAddress,
                client,
                testAddress,
                call: call as SwapBuildOutputExactIn,
                outputTest: outputTest || TEST_CONSTANTS.defaultOutputTest,
                exactInQueryOutput: queryOutput as ExactInQueryOutput,
            });
        } else {
            await assertResultExactOut({
                wethIsEth,
                swap,
                chainId,
                contractToCall: routerAddress,
                client,
                testAddress,
                call: call as SwapBuildOutputExactOut,
                inputTest: inputTest || TEST_CONSTANTS.defaultInputTest,
                exactOutQueryOutput: queryOutput as ExactOutQueryOutput,
            });
        }
        // Save both query output and call data for new tests
        setTestData(swapTestData, testName, context, subContext, swapKind, {
            queryOutput: serializeQueryOutput(queryOutput),
            call: serializedCall,
        });
    }
}

// ----------------------------------------------------------------------------
// Main Test Function
// ----------------------------------------------------------------------------

/**
 * Configuration for running a swap test.
 */
type TestSwapConfig = {
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
    inputTest?: {
        testExactInAmount: boolean;
        percentage: number;
    };
};

/**
 * Executes a swap test by loading query output, building call data, and asserting results.
 * Can use saved test data for faster execution or run full integration tests.
 * @param config - Test configuration
 */
async function testSwap(config: TestSwapConfig) {
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
        inputTest = TEST_CONSTANTS.defaultInputTest,
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
    const hasSavedData = hasSavedTestData(savedData);

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

    // Build and serialize call
    const { call, serializedCall } = buildAndSerializeCall(
        swap,
        queryOutput,
        slippage,
        deadline,
        wethIsEth,
    );

    // Assert or compare results
    await assertOrCompareSwapResult({
        hasSavedData,
        serializedCall,
        savedData,
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
        inputTest,
        testName,
        context,
        subContext,
    });
}
