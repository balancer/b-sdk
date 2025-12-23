import {
    AddLiquidityKind,
    AddLiquidityNestedInput,
    Address,
    ChainId,
    Permit2,
    PublicWalletClient,
} from '@/index';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED } from '@/index';
import { Hex, TestActions } from 'viem';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    Test,
    isNestedTest,
} from '../../../v3/addLiquidity/addLiquidityTestConfig';
import {
    setupNativeInputBalancesNested,
    setupPermit2ApprovalNested,
    setupPermit2SignatureNested,
} from '../addLiquidityNestedTestFixture';
import {
    TestAddLiquidityNestedConfig,
    runAddLiquidityNestedTest,
    runAddLiquidityNestedTestWithSignature,
} from '../addLiquidityNestedTestRunner';
import {
    AddLiquidityTestStrategy,
    ContextSetupConfig,
    TestCaseConfig,
} from '../addLiquidityTestStrategy';

/**
 * Test cases configuration for nested add liquidity tests.
 * Nested tests only have one test case (unbalanced).
 */
const TEST_CASES: TestCaseConfig<AddLiquidityNestedInput>[] = [
    {
        kind: AddLiquidityKind.Unbalanced,
        getInput: (chainId, rpcUrl, test) => {
            if (!isNestedTest(test)) {
                throw new Error('Expected NestedTest');
            }
            return {
                chainId,
                rpcUrl,
                amountsIn: test.unbalancedAmounts,
            };
        },
        getDescription: () => 'should handle nested add liquidity',
    },
];

/**
 * Strategy implementation for nested add liquidity tests.
 */
export class NestedTestStrategy implements AddLiquidityTestStrategy {
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
        wethIsEth: boolean,
    ): TestAddLiquidityNestedConfig {
        if (!isNestedTest(test)) {
            throw new Error('Expected NestedTest');
        }

        const addLiquidityNestedInput = testCase.getInput(
            test.chainId,
            fork?.rpcUrl || '',
            test,
        ) as AddLiquidityNestedInput;

        return {
            chainId: test.chainId,
            nestedPoolState: test.nestedPoolState,
            addLiquidityNestedInput,
            wethIsEth,
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
        const testConfig = config as TestAddLiquidityNestedConfig;

        if (context === TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL) {
            await runAddLiquidityNestedTestWithSignature(
                testConfig,
                savedData,
                newData,
                permit2,
            );
        } else {
            await runAddLiquidityNestedTest(testConfig, savedData, newData);
        }
    }

    async setupNativeInputContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        if (!config.client || !config.fork) {
            return undefined;
        }

        if (!isNestedTest(config.test)) {
            throw new Error('Expected NestedTest');
        }

        return await setupNativeInputBalancesNested(
            config.client,
            config.testAddress,
            config.test.nestedPoolState,
            config.test.chainId,
        );
    }

    async setupPermit2SignatureContext(
        config: ContextSetupConfig,
    ): Promise<{ permit2: Permit2; snapshot: Hex } | undefined> {
        if (!config.client || !config.fork) {
            return undefined;
        }

        if (!isNestedTest(config.test)) {
            throw new Error('Expected NestedTest');
        }

        return await setupPermit2SignatureNested(
            config.client,
            config.testAddress,
            config.test.nestedPoolState,
            config.contractToCall,
        );
    }

    async setupPermit2DirectApprovalContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        if (!config.client || !config.fork || !config.snapshotPreApprove) {
            return undefined;
        }

        if (!isNestedTest(config.test)) {
            throw new Error('Expected NestedTest');
        }

        return await setupPermit2ApprovalNested(
            config.client,
            config.testAddress,
            config.test.nestedPoolState,
            config.contractToCall,
            config.snapshotPreApprove,
        );
    }

    getContractAddress(test: Test): Address {
        if (!isNestedTest(test)) {
            throw new Error('Expected NestedTest');
        }
        return BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[test.chainId];
    }

    supportsNativeInput(test: Test): boolean {
        return isNestedTest(test) && (test.isNativeIn ?? false);
    }
}
