// pnpm test ./test/v3/addLiquidity/addLiquidity.integration.test.ts
import { config } from 'dotenv';
config();
import { TestActions, Hex } from 'viem';
import { PublicWalletClient, AddressProvider } from '@/index';

import { stopAnvilFork } from 'test/anvil/anvil-global-setup';
import { setupForkAndClientV3 } from 'test/lib/utils/addLiquidityTestFixture';
import { setupForkAndClientV3Buffer } from 'test/lib/utils/addLiquidityBufferTestFixture';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    tests,
    isRegularTest,
    isBufferTest,
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
} from 'test/lib/utils/addLiquidityTestHelpers';
import {
    setupAndRunBufferTestCases,
    setupPermit2SignatureContextBuffer,
    setupPermit2DirectApprovalContextBuffer,
} from 'test/lib/utils/addLiquidityBufferTestHelpers';
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
        const contractToCall = isBufferTest(test)
            ? AddressProvider.BufferRouter(test.chainId)
            : AddressProvider.Router(test.chainId);

        beforeAll(async () => {
            // Only run fork/client setup if at least one test doesn't have saved data
            const testConfig = isBufferTest(test)
                ? { name: test.name, testType: 'buffer' as const }
                : { name: test.name, isNativeIn: test.isNativeIn };
            if (!allTestsHaveSavedData(testConfig, savedAddLiquidityTestData)) {
                const setup = isBufferTest(test)
                    ? await setupForkAndClientV3Buffer(test, jobId, testAddress)
                    : await setupForkAndClientV3(test, jobId, testAddress);
                fork = setup.fork;
                client = setup.client;
                snapshotPreApprove = setup.snapshotPreApprove;
            }
        });

        // Buffer tests don't support native input
        if (isRegularTest(test) && test.isNativeIn) {
            describe.sequential(TEST_CONTEXTS.NATIVE_INPUT, () => {
                let snapshotNativeInput: Hex | undefined;
                beforeAll(async () => {
                    snapshotNativeInput = await setupNativeInputContext(
                        client,
                        fork,
                        test,
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
            let permit2:
                | Awaited<ReturnType<typeof setupPermit2SignatureContextBuffer>>
                | Awaited<ReturnType<typeof setupPermit2SignatureContext>>;
            beforeAll(async () => {
                permit2 = isBufferTest(test)
                    ? await setupPermit2SignatureContextBuffer(
                          client,
                          fork,
                          test,
                          testAddress,
                          contractToCall,
                      )
                    : await setupPermit2SignatureContext(
                          client,
                          fork,
                          test,
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

            if (isBufferTest(test)) {
                setupAndRunBufferTestCases(
                    test,
                    TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL,
                    () => fork,
                    contractToCall,
                    () => client,
                    testAddress,
                    savedAddLiquidityTestData,
                    addLiquidityTestData,
                    () =>
                        permit2 && 'permit2' in permit2
                            ? permit2.permit2
                            : undefined,
                );
            } else {
                setupAndRunTestCases(
                    test,
                    TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL,
                    () => fork,
                    contractToCall,
                    () => client,
                    testAddress,
                    false, // wethIsEth
                    savedAddLiquidityTestData,
                    addLiquidityTestData,
                    () =>
                        permit2 && 'permit2' in permit2
                            ? permit2.permit2
                            : undefined,
                );
            }
        });

        describe.sequential(TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL, () => {
            beforeAll(async () => {
                snapshotPreApprove = isBufferTest(test)
                    ? await setupPermit2DirectApprovalContextBuffer(
                          client,
                          fork,
                          snapshotPreApprove,
                          test,
                          testAddress,
                          contractToCall,
                      )
                    : await setupPermit2DirectApprovalContext(
                          client,
                          fork,
                          snapshotPreApprove,
                          test,
                          testAddress,
                          contractToCall,
                      );
            });

            if (isBufferTest(test)) {
                setupAndRunBufferTestCases(
                    test,
                    TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL,
                    () => fork,
                    contractToCall,
                    () => client,
                    testAddress,
                    savedAddLiquidityTestData,
                    addLiquidityTestData,
                );
            } else {
                setupAndRunTestCases(
                    test,
                    TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL,
                    () => fork,
                    contractToCall,
                    () => client,
                    testAddress,
                    false, // wethIsEth
                    savedAddLiquidityTestData,
                    addLiquidityTestData,
                );
            }
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
