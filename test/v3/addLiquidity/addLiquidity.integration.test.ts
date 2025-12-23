// pnpm test ./test/v3/addLiquidity/addLiquidity.integration.test.ts
import { config } from 'dotenv';
config();
import { TestActions, Hex } from 'viem';
import { PublicWalletClient, Permit2 } from '@/index';

import { stopAnvilFork } from 'test/anvil/anvil-global-setup';
import { setupForkAndClientV3 } from 'test/lib/utils/addLiquidityTestFixture';
import { setupForkAndClientV3Buffer } from 'test/lib/utils/addLiquidityBufferTestFixture';
import { setupForkAndClientV3Boosted } from 'test/lib/utils/addLiquidityBoostedTestFixture';
import { setupForkAndClientV3Nested } from 'test/lib/utils/addLiquidityNestedTestFixture';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    tests,
    isRegularTest,
    isBufferTest,
    isBoostedTest,
    isNestedTest,
} from './addLiquidityTestConfig';
import {
    loadAddLiquidityTestData,
    saveAddLiquidityTestData,
    allTestsHaveSavedData,
} from 'test/lib/utils/addLiquidityTestDataHelpers';
import {
    setupAndRunTestCases,
    setupNativeInputContext,
    setupPermit2SignatureContext,
    setupPermit2DirectApprovalContext,
} from 'test/lib/utils/addLiquidityUnifiedTestRunner';
import { getTestStrategy } from 'test/lib/utils/addLiquidityTestStrategyFactory';
import { generateJobId } from 'test/lib/utils';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory of the current test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const addLiquidityTestDataPath = join(
    __dirname,
    TEST_CONSTANTS.ADD_LIQUIDITY_TEST_DATA_FILENAME,
);
const jobId = generateJobId(__filename);

// Load existing test data (if file exists)
const savedAddLiquidityTestData = loadAddLiquidityTestData(
    addLiquidityTestDataPath,
);

// Data collection for add liquidity test call data (nested structure)
const addLiquidityTestData: Record<string, unknown> = {};

for (const test of tests) {
    describe.sequential(test.name, () => {
        let snapshotPreApprove: Hex | undefined;
        let fork: { rpcUrl: string } | undefined;
        let client: (PublicWalletClient & TestActions) | undefined;
        const testAddress = TEST_CONSTANTS.ANVIL_TEST_ADDRESS;
        const strategy = getTestStrategy(test);
        const contractToCall = strategy.getContractAddress(test);

        beforeAll(async () => {
            // Only run fork/client setup if at least one test doesn't have saved data
            const testConfig = isBufferTest(test)
                ? { name: test.name, testType: 'buffer' as const }
                : isBoostedTest(test)
                  ? {
                        name: test.name,
                        testType: 'boosted' as const,
                        isNativeIn: test.isNativeIn,
                    }
                  : isNestedTest(test)
                    ? {
                          name: test.name,
                          testType: 'nested' as const,
                          isNativeIn: test.isNativeIn,
                      }
                    : { name: test.name, isNativeIn: test.isNativeIn };
            if (!allTestsHaveSavedData(testConfig, savedAddLiquidityTestData)) {
                const setup = isBufferTest(test)
                    ? await setupForkAndClientV3Buffer(test, jobId, testAddress)
                    : isBoostedTest(test)
                      ? await setupForkAndClientV3Boosted(
                            test,
                            jobId,
                            testAddress,
                        )
                      : isNestedTest(test)
                        ? await setupForkAndClientV3Nested(
                              test,
                              jobId,
                              testAddress,
                          )
                        : await setupForkAndClientV3(test, jobId, testAddress);
                fork = setup.fork;
                client = setup.client;
                snapshotPreApprove = setup.snapshotPreApprove;
            }
        });

        // Native input tests (if supported by test type)
        if (strategy.supportsNativeInput(test)) {
            describe.sequential(TEST_CONTEXTS.NATIVE_INPUT, () => {
                let snapshotNativeInput: Hex | undefined;
                beforeAll(async () => {
                    snapshotNativeInput = await setupNativeInputContext(
                        test,
                        strategy,
                        client,
                        fork,
                        testAddress,
                    );
                });
                beforeEach(async () => {
                    // Only run if fork/client were initialized
                    if (client && fork && snapshotNativeInput) {
                        await client.revert({
                            id: snapshotNativeInput,
                        });
                        snapshotNativeInput = await client.snapshot();
                    }
                });

                setupAndRunTestCases(
                    test,
                    TEST_CONTEXTS.NATIVE_INPUT,
                    strategy,
                    () => fork,
                    contractToCall,
                    () => client,
                    testAddress,
                    true, // wethIsEth
                    savedAddLiquidityTestData,
                    addLiquidityTestData,
                );
            });
        }

        describe.sequential(TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL, () => {
            let permit2: { permit2: Permit2; snapshot: Hex } | undefined;
            beforeAll(async () => {
                permit2 = await setupPermit2SignatureContext(
                    test,
                    strategy,
                    client,
                    fork,
                    testAddress,
                    contractToCall,
                );
            });
            beforeEach(async () => {
                // Only run if fork/client were initialized
                // Signatures consume the nonce so we need to reset snapshot after each sig test
                if (client && fork && permit2) {
                    await client.revert({
                        id: permit2.snapshot,
                    });
                    permit2.snapshot = await client.snapshot();
                }
            });

            setupAndRunTestCases(
                test,
                TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL,
                strategy,
                () => fork,
                contractToCall,
                () => client,
                testAddress,
                false, // wethIsEth
                savedAddLiquidityTestData,
                addLiquidityTestData,
                () => permit2?.permit2,
            );
        });

        describe.sequential(TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL, () => {
            beforeAll(async () => {
                snapshotPreApprove = await setupPermit2DirectApprovalContext(
                    test,
                    strategy,
                    client,
                    fork,
                    snapshotPreApprove,
                    testAddress,
                    contractToCall,
                );
            });

            // Determine wethIsEth based on test type
            const wethIsEth =
                isBoostedTest(test) || isNestedTest(test)
                    ? (test.isNativeIn ?? false)
                    : false;

            setupAndRunTestCases(
                test,
                TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL,
                strategy,
                () => fork,
                contractToCall,
                () => client,
                testAddress,
                wethIsEth,
                savedAddLiquidityTestData,
                addLiquidityTestData,
            );
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

// Write add liquidity test data to JSON file after all tests complete
afterAll(async () => {
    await saveAddLiquidityTestData(
        addLiquidityTestDataPath,
        savedAddLiquidityTestData,
        addLiquidityTestData,
    );
});
