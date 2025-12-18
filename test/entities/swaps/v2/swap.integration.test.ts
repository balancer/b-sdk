// pnpm test test/entities/swaps/v2/swap.integration.test.ts
import { config } from 'dotenv';
config();
import { TestActions, Hex } from 'viem';
import { SwapKind, PublicWalletClient, VAULT_V2 } from '@/index';

import { stopAnvilFork } from 'test/anvil/anvil-global-setup';
import {
    setupForkAndClientV2,
    setupV2Approval,
} from 'test/lib/utils/swapTestFixture';
import {
    TEST_CONSTANTS_V2,
    testsV2,
    allTestsHaveSavedDataV2,
} from './swapTestConfig';
import { loadSwapTestData, saveSwapTestData } from 'test/lib/utils';
import { runSwapTest } from 'test/lib/utils/swapTestRunner';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory of the current test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const swapTestDataPath = join(
    __dirname,
    TEST_CONSTANTS_V2.SWAP_TEST_DATA_FILENAME,
);
const jobId =
    basename(__filename)
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) % 10000;

// Load existing test data (if file exists)
const savedSwapTestData = loadSwapTestData(swapTestDataPath);

// Data collection for swap test call data (nested structure)
const swapTestData: Record<string, unknown> = {};

for (const test of testsV2) {
    describe.sequential(test.name, () => {
        let snapshot: Hex | undefined;
        let fork: { rpcUrl: string } | undefined;
        let client: (PublicWalletClient & TestActions) | undefined;
        const testAddress = TEST_CONSTANTS_V2.ANVIL_TEST_ADDRESS;
        const contractToCall = VAULT_V2[test.chainId];

        beforeAll(async () => {
            // Only run fork/client setup if at least one test doesn't have saved data
            if (!allTestsHaveSavedDataV2(test, savedSwapTestData)) {
                const setup = await setupForkAndClientV2(
                    test,
                    jobId,
                    testAddress,
                );
                fork = setup.fork;
                client = setup.client;
            }
        });

        if (test.isNative === 'input') {
            describe.sequential('native input', () => {
                it('should handle GivenIn swap', async () => {
                    await runSwapTest(
                        {
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenIn,
                            wethIsEth: true,
                            fork,
                            contractToCall,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS_V2.slippage,
                            deadline: TEST_CONSTANTS_V2.deadline,
                            testName: test.name,
                            context: 'native input',
                            subContext: undefined,
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS_V2.defaultOutputTest,
                        },
                        savedSwapTestData,
                        swapTestData,
                    );
                });

                it('should handle GivenOut swap', async () => {
                    await runSwapTest(
                        {
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenOut,
                            wethIsEth: true,
                            fork,
                            contractToCall,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS_V2.slippage,
                            deadline: TEST_CONSTANTS_V2.deadline,
                            testName: test.name,
                            context: 'native input',
                            subContext: undefined,
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS_V2.defaultOutputTest,
                        },
                        savedSwapTestData,
                        swapTestData,
                    );
                });
            });
        }

        describe.sequential('token swap', () => {
            beforeAll(async () => {
                // Only run if fork/client were initialized
                if (client && fork) {
                    snapshot = await setupV2Approval(
                        client,
                        testAddress,
                        test.path,
                        contractToCall,
                        TEST_CONSTANTS_V2.BALANCE_MULTIPLIER,
                    );
                }
            });

            beforeEach(async () => {
                // Only run if fork/client were initialized
                if (client && fork && snapshot) {
                    await client.revert({
                        id: snapshot,
                    });
                    snapshot = await client.snapshot();
                }
            });

            if (test.isNative === 'output') {
                describe.sequential('native output', () => {
                    it('should handle GivenIn swap', async () => {
                        await runSwapTest(
                            {
                                chainId: test.chainId,
                                path: test.path,
                                swapKind: SwapKind.GivenIn,
                                wethIsEth: true,
                                fork,
                                contractToCall,
                                client,
                                testAddress,
                                slippage: TEST_CONSTANTS_V2.slippage,
                                deadline: TEST_CONSTANTS_V2.deadline,
                                testName: test.name,
                                context: 'native output',
                                subContext: undefined,
                                outputTest:
                                    test.outputTest ||
                                    TEST_CONSTANTS_V2.defaultOutputTest,
                            },
                            savedSwapTestData,
                            swapTestData,
                        );
                    });

                    it('should handle GivenOut swap', async () => {
                        await runSwapTest(
                            {
                                chainId: test.chainId,
                                path: test.path,
                                swapKind: SwapKind.GivenOut,
                                wethIsEth: true,
                                fork,
                                contractToCall,
                                client,
                                testAddress,
                                slippage: TEST_CONSTANTS_V2.slippage,
                                deadline: TEST_CONSTANTS_V2.deadline,
                                testName: test.name,
                                context: 'native output',
                                subContext: undefined,
                                outputTest:
                                    test.outputTest ||
                                    TEST_CONSTANTS_V2.defaultOutputTest,
                            },
                            savedSwapTestData,
                            swapTestData,
                        );
                    });
                });
            }

            describe.sequential('token swap', () => {
                it('should handle GivenIn swap', async () => {
                    await runSwapTest(
                        {
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenIn,
                            wethIsEth: false,
                            fork,
                            contractToCall,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS_V2.slippage,
                            deadline: TEST_CONSTANTS_V2.deadline,
                            testName: test.name,
                            context: 'token swap',
                            subContext: undefined,
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS_V2.defaultOutputTest,
                        },
                        savedSwapTestData,
                        swapTestData,
                    );
                });

                it('should handle GivenOut swap', async () => {
                    await runSwapTest(
                        {
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenOut,
                            wethIsEth: false,
                            fork,
                            contractToCall,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS_V2.slippage,
                            deadline: TEST_CONSTANTS_V2.deadline,
                            testName: test.name,
                            context: 'token swap',
                            subContext: undefined,
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS_V2.defaultOutputTest,
                        },
                        savedSwapTestData,
                        swapTestData,
                    );
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
