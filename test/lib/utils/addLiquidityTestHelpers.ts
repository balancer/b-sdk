import { TestActions, Hex } from 'viem';
import {
    PublicWalletClient,
    Permit2,
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    AddLiquiditySingleTokenInput,
    AddLiquidityProportionalInput,
    ChainId,
    Address,
} from '@/index';
import {
    setupPermit2Approval,
    setupPermit2Signature,
    setupNativeInputBalances,
} from './addLiquidityTestFixture';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    Test,
} from '../../v3/addLiquidity/addLiquidityTestConfig';
import {
    runAddLiquidityTest,
    runAddLiquidityTestWithSignature,
    TestAddLiquidityConfig,
} from './addLiquidityTestRunner';

/**
 * Configuration for a single test case.
 */
export type TestCaseConfig = {
    kind: AddLiquidityKind;
    proportionalType?: 'bptOut' | 'amountIn';
    getInput: (
        chainId: ChainId,
        rpcUrl: string,
        test: Test,
    ) =>
        | AddLiquidityUnbalancedInput
        | AddLiquiditySingleTokenInput
        | AddLiquidityProportionalInput;
};

/**
 * Test cases configuration for add liquidity tests.
 */
export const TEST_CASES: TestCaseConfig[] = [
    {
        kind: AddLiquidityKind.Unbalanced,
        getInput: (chainId, rpcUrl, test) => ({
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Unbalanced,
            amountsIn: test.unbalancedAmounts,
        }),
    },
    {
        kind: AddLiquidityKind.SingleToken,
        getInput: (chainId, rpcUrl, test) => ({
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.SingleToken,
            bptOut: test.singleTokenBptOut,
            tokenIn: test.singleTokenIn,
        }),
    },
    {
        kind: AddLiquidityKind.Proportional,
        proportionalType: 'bptOut',
        getInput: (chainId, rpcUrl, test) => ({
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Proportional,
            referenceAmount: test.proportionalBptOut,
        }),
    },
    {
        kind: AddLiquidityKind.Proportional,
        proportionalType: 'amountIn',
        getInput: (chainId, rpcUrl, test) => ({
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Proportional,
            referenceAmount: test.proportionalAmountIn,
        }),
    },
];

/**
 * Creates a test configuration for running an add liquidity test.
 */
function createTestConfig(
    test: Test,
    context: string,
    testCase: TestCaseConfig,
    fork: { rpcUrl: string } | undefined,
    contractToCall: Address,
    client: (PublicWalletClient & TestActions) | undefined,
    testAddress: Address,
    wethIsEth: boolean,
): TestAddLiquidityConfig {
    const addLiquidityInput = testCase.getInput(
        test.chainId,
        fork?.rpcUrl || '',
        test,
    );

    return {
        chainId: test.chainId,
        poolState: test.poolState,
        addLiquidityInput,
        wethIsEth,
        fork,
        contractToCall,
        client,
        testAddress,
        slippage: TEST_CONSTANTS.slippage,
        testName: test.name,
        context,
        addLiquidityKind: testCase.kind,
        proportionalType: testCase.proportionalType,
    };
}

/**
 * Runs a single test case for add liquidity.
 */
async function runTestCase(
    test: Test,
    context: string,
    testCase: TestCaseConfig,
    fork: { rpcUrl: string } | undefined,
    contractToCall: Address,
    client: (PublicWalletClient & TestActions) | undefined,
    testAddress: Address,
    wethIsEth: boolean,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2?: Permit2,
): Promise<void> {
    const config = createTestConfig(
        test,
        context,
        testCase,
        fork,
        contractToCall,
        client,
        testAddress,
        wethIsEth,
    );

    // For permit2 signature approval context, always use runAddLiquidityTestWithSignature
    // It will load permit2 from saved data if not provided
    if (context === TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL) {
        await runAddLiquidityTestWithSignature(
            config,
            savedAddLiquidityTestData,
            addLiquidityTestData,
            permit2,
        );
    } else {
        await runAddLiquidityTest(
            config,
            savedAddLiquidityTestData,
            addLiquidityTestData,
        );
    }
}

/**
 * Gets the test description for a test case.
 */
export function getTestCaseDescription(testCase: TestCaseConfig): string {
    if (testCase.kind === AddLiquidityKind.Proportional) {
        return `should handle Proportional add liquidity with ${testCase.proportionalType}`;
    }
    return `should handle ${testCase.kind} add liquidity`;
}

/**
 * Sets up and runs all test cases for a given context.
 * This function should be called synchronously during describe block setup.
 * fork, client, and permit2 are accessed from the closure when tests actually run.
 */
export function setupAndRunTestCases(
    test: Test,
    context: string,
    getFork: () => { rpcUrl: string } | undefined,
    contractToCall: Address,
    getClient: () => (PublicWalletClient & TestActions) | undefined,
    testAddress: Address,
    wethIsEth: boolean,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    getPermit2?: () => Permit2 | undefined,
): void {
    for (const testCase of TEST_CASES) {
        const description = getTestCaseDescription(testCase);
        it(description, async () => {
            await runTestCase(
                test,
                context,
                testCase,
                getFork(),
                contractToCall,
                getClient(),
                testAddress,
                wethIsEth,
                savedAddLiquidityTestData,
                addLiquidityTestData,
                getPermit2?.(),
            );
        });
    }
}

/**
 * Sets up native input test context with snapshot management.
 */
export async function setupNativeInputContext(
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    test: Test,
    testAddress: Address,
): Promise<Hex | undefined> {
    if (!client || !fork) {
        return undefined;
    }

    return await setupNativeInputBalances(
        client,
        testAddress,
        test.poolState,
        test.chainId,
    );
}

/**
 * Sets up permit2 signature approval context.
 */
export async function setupPermit2SignatureContext(
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    test: Test,
    testAddress: Address,
    contractToCall: Address,
): Promise<{ permit2: Permit2; snapshot: Hex } | undefined> {
    if (!client || !fork) {
        return undefined;
    }

    return await setupPermit2Signature(
        client,
        testAddress,
        test.poolState,
        contractToCall,
    );
}

/**
 * Sets up permit2 direct approval context.
 */
export async function setupPermit2DirectApprovalContext(
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    snapshotPreApprove: Hex | undefined,
    test: Test,
    testAddress: Address,
    contractToCall: Address,
): Promise<Hex | undefined> {
    if (!client || !fork || !snapshotPreApprove) {
        return undefined;
    }

    return await setupPermit2Approval(
        client,
        testAddress,
        test.poolState,
        contractToCall,
        snapshotPreApprove,
    );
}
