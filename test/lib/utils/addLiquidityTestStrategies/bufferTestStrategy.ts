import { TestActions, Hex } from 'viem';
import {
    PublicWalletClient,
    Permit2,
    AddLiquidityKind,
    ChainId,
    Address,
    AddLiquidityBufferInput,
} from '@/index';
import {
    setupPermit2ApprovalBuffer,
    setupPermit2SignatureBuffer,
} from '../addLiquidityBufferTestFixture';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    Test,
    isBufferTest,
} from '../../../v3/addLiquidity/addLiquidityTestConfig';
import {
    runAddLiquidityBufferTest,
    runAddLiquidityBufferTestWithSignature,
    TestAddLiquidityBufferConfig,
} from '../addLiquidityBufferTestRunner';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    AddLiquidityTestStrategy,
    TestCaseConfig,
    ContextSetupConfig,
} from '../addLiquidityTestStrategy';

/**
 * Test cases configuration for buffer add liquidity tests.
 * Buffer tests only have one test case (exactSharesToIssue).
 */
const TEST_CASES: TestCaseConfig<AddLiquidityBufferInput>[] = [
    {
        kind: AddLiquidityKind.Unbalanced, // Using Unbalanced as the kind for buffer tests
        getInput: (chainId, rpcUrl, test) => {
            if (!isBufferTest(test)) {
                throw new Error('Expected BufferTest');
            }
            return {
                chainId,
                rpcUrl,
                exactSharesToIssue: test.exactSharesToIssue,
            };
        },
        getDescription: () => 'should handle buffer add liquidity',
    },
];

/**
 * Strategy implementation for buffer add liquidity tests.
 */
export class BufferTestStrategy implements AddLiquidityTestStrategy {
    getTestCases(): TestCaseConfig[] {
        return TEST_CASES;
    }

    createTestConfig(
        test: Test,
        context: string,
        testCase: TestCaseConfig,
        fork: { rpcUrl: string } | undefined,
        contractToCall: Address,
        client: (PublicWalletClient & TestActions) | undefined,
        testAddress: Address,
        _wethIsEth: boolean,
    ): TestAddLiquidityBufferConfig {
        if (!isBufferTest(test)) {
            throw new Error('Expected BufferTest');
        }

        const addLiquidityBufferInput = testCase.getInput(
            test.chainId,
            fork?.rpcUrl || '',
            test,
        ) as AddLiquidityBufferInput;

        return {
            chainId: test.chainId,
            bufferState: test.bufferState,
            addLiquidityBufferInput,
            fork,
            contractToCall,
            client,
            testAddress,
            slippage: TEST_CONSTANTS.slippage,
            testName: test.name,
            context,
        };
    }

    async runTest(
        config: unknown,
        context: string,
        savedData: Record<string, unknown>,
        newData: Record<string, unknown>,
        permit2?: Permit2,
    ): Promise<void> {
        const testConfig = config as TestAddLiquidityBufferConfig;

        if (context === TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL) {
            await runAddLiquidityBufferTestWithSignature(
                testConfig,
                savedData,
                newData,
                permit2,
            );
        } else {
            await runAddLiquidityBufferTest(testConfig, savedData, newData);
        }
    }

    async setupNativeInputContext(
        _config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        // Buffer tests don't support native input
        return undefined;
    }

    async setupPermit2SignatureContext(
        config: ContextSetupConfig,
    ): Promise<{ permit2: Permit2; snapshot: Hex } | undefined> {
        if (!config.client || !config.fork) {
            return undefined;
        }

        if (!isBufferTest(config.test)) {
            throw new Error('Expected BufferTest');
        }

        return await setupPermit2SignatureBuffer(
            config.client,
            config.testAddress,
            config.test.bufferState,
            config.contractToCall,
        );
    }

    async setupPermit2DirectApprovalContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        if (!config.client || !config.fork || !config.snapshotPreApprove) {
            return undefined;
        }

        if (!isBufferTest(config.test)) {
            throw new Error('Expected BufferTest');
        }

        return await setupPermit2ApprovalBuffer(
            config.client,
            config.testAddress,
            config.test.bufferState,
            config.contractToCall,
            config.snapshotPreApprove,
        );
    }

    getContractAddress(test: Test): Address {
        if (!isBufferTest(test)) {
            throw new Error('Expected BufferTest');
        }
        return AddressProvider.BufferRouter(test.chainId);
    }

    supportsNativeInput(_test: Test): boolean {
        // Buffer tests don't support native input
        return false;
    }
}
