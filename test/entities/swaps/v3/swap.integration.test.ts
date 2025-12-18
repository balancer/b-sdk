// pnpm test ./test/entities/swaps/v3/swap.integration.test.ts
import { config } from 'dotenv';
config();
import { TestActions, Hex } from 'viem';
import {
    SwapKind,
    PublicWalletClient,
    AddressProvider,
    Permit2,
} from '@/index';

import { stopAnvilFork } from 'test/anvil/anvil-global-setup';
import {
    setupForkAndClientV3,
    setupPermit2Approval,
    setupPermit2Signature,
} from 'test/lib/utils/swapTestFixture';
import { TEST_CONSTANTS, tests } from './swapTestConfig';
import {
    loadSwapTestData,
    saveSwapTestData,
    allTestsHaveSavedData,
} from 'test/lib/utils';
import {
    runSwapTest,
    runSwapTestWithSignature,
} from 'test/lib/utils/swapTestRunner';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory of the current test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const swapTestDataPath = join(
    __dirname,
    TEST_CONSTANTS.SWAP_TEST_DATA_FILENAME,
);
const jobId =
    basename(__filename)
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) % 10000;

// Load existing test data (if file exists)
const savedSwapTestData = loadSwapTestData(swapTestDataPath);

// Data collection for swap test call data (nested structure)
const swapTestData: Record<string, unknown> = {};

for (const test of tests) {
    describe.sequential(test.name, () => {
        let snapshotPreApprove: Hex | undefined;
        let fork: { rpcUrl: string } | undefined;
        let client: (PublicWalletClient & TestActions) | undefined;
        const testAddress = TEST_CONSTANTS.ANVIL_TEST_ADDRESS;
        const contractToCall =
            test.path.pools.length > 1
                ? AddressProvider.BatchRouter(test.chainId)
                : AddressProvider.Router(test.chainId);

        beforeAll(async () => {
            // Only run fork/client setup if at least one test doesn't have saved data
            if (!allTestsHaveSavedData(test, savedSwapTestData)) {
                const setup = await setupForkAndClientV3(
                    test,
                    jobId,
                    testAddress,
                );
                fork = setup.fork;
                client = setup.client;
                snapshotPreApprove = setup.snapshotPreApprove;
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
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'native input',
                            subContext: undefined,
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS.defaultOutputTest,
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
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'native input',
                            subContext: undefined,
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS.defaultOutputTest,
                        },
                        savedSwapTestData,
                        swapTestData,
                    );
                });
            });
        }

        describe.sequential('permit2 signature approval', () => {
            let permit2: Permit2;
            let snapShotPermit2: Hex;
            beforeAll(async () => {
                // Only run if fork/client were initialized
                if (client && fork) {
                    const { permit2: permit2Sig, snapshot } =
                        await setupPermit2Signature(
                            client,
                            testAddress,
                            test.path,
                            contractToCall,
                            TEST_CONSTANTS.BALANCE_MULTIPLIER,
                        );
                    permit2 = permit2Sig;
                    snapShotPermit2 = snapshot;
                }
            });
            beforeEach(async () => {
                // Only run if fork/client were initialized
                if (client && fork) {
                    // signatures consume the nonce so we need to reset snapshot after each sig test
                    await client.revert({
                        id: snapShotPermit2,
                    });
                    snapShotPermit2 = await client.snapshot();
                }
            });

            if (test.isNative === 'output') {
                describe.sequential('native output', () => {
                    it('should handle GivenIn swap', async () => {
                        await runSwapTestWithSignature(
                            {
                                chainId: test.chainId,
                                path: test.path,
                                swapKind: SwapKind.GivenIn,
                                wethIsEth: true,
                                fork,
                                contractToCall,
                                client,
                                testAddress,
                                slippage: TEST_CONSTANTS.slippage,
                                deadline: TEST_CONSTANTS.deadline,
                                testName: test.name,
                                context: 'permit2 signature approval',
                                subContext: 'native output',
                                outputTest:
                                    test.outputTest ||
                                    TEST_CONSTANTS.defaultOutputTest,
                            },
                            savedSwapTestData,
                            swapTestData,
                            permit2,
                        );
                    });
                    it('should handle GivenOut swap', async () => {
                        await runSwapTestWithSignature(
                            {
                                chainId: test.chainId,
                                path: test.path,
                                swapKind: SwapKind.GivenOut,
                                wethIsEth: true,
                                fork,
                                contractToCall,
                                client,
                                testAddress,
                                slippage: TEST_CONSTANTS.slippage,
                                deadline: TEST_CONSTANTS.deadline,
                                testName: test.name,
                                context: 'permit2 signature approval',
                                subContext: 'native output',
                                outputTest:
                                    test.outputTest ||
                                    TEST_CONSTANTS.defaultOutputTest,
                            },
                            savedSwapTestData,
                            swapTestData,
                            permit2,
                        );
                    });
                });
            }

            describe.sequential('token output', () => {
                it('should handle GivenIn swap', async () => {
                    await runSwapTestWithSignature(
                        {
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenIn,
                            wethIsEth: false,
                            fork,
                            contractToCall,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'permit2 signature approval',
                            subContext: 'token output',
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS.defaultOutputTest,
                        },
                        savedSwapTestData,
                        swapTestData,
                        permit2,
                    );
                });

                it('should handle GivenOut swap', async () => {
                    await runSwapTestWithSignature(
                        {
                            chainId: test.chainId,
                            path: test.path,
                            swapKind: SwapKind.GivenOut,
                            wethIsEth: false,
                            fork,
                            contractToCall,
                            client,
                            testAddress,
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'permit2 signature approval',
                            subContext: 'token output',
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS.defaultOutputTest,
                        },
                        savedSwapTestData,
                        swapTestData,
                        permit2,
                    );
                });
            });
        });
        describe.sequential('permit2 direct approval', () => {
            beforeAll(async () => {
                // Only run if fork/client were initialized
                if (client && fork && snapshotPreApprove) {
                    snapshotPreApprove = await setupPermit2Approval(
                        client,
                        testAddress,
                        test.path,
                        contractToCall,
                        snapshotPreApprove,
                        TEST_CONSTANTS.BALANCE_MULTIPLIER,
                    );
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
                                slippage: TEST_CONSTANTS.slippage,
                                deadline: TEST_CONSTANTS.deadline,
                                testName: test.name,
                                context: 'permit2 direct approval',
                                subContext: 'native output',
                                outputTest:
                                    test.outputTest ||
                                    TEST_CONSTANTS.defaultOutputTest,
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
                                slippage: TEST_CONSTANTS.slippage,
                                deadline: TEST_CONSTANTS.deadline,
                                testName: test.name,
                                context: 'permit2 direct approval',
                                subContext: 'native output',
                                outputTest:
                                    test.outputTest ||
                                    TEST_CONSTANTS.defaultOutputTest,
                            },
                            savedSwapTestData,
                            swapTestData,
                        );
                    });
                });
            }

            describe.sequential('token output', () => {
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
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'permit2 direct approval',
                            subContext: 'token output',
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS.defaultOutputTest,
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
                            slippage: TEST_CONSTANTS.slippage,
                            deadline: TEST_CONSTANTS.deadline,
                            testName: test.name,
                            context: 'permit2 direct approval',
                            subContext: 'token output',
                            outputTest:
                                test.outputTest ||
                                TEST_CONSTANTS.defaultOutputTest,
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
