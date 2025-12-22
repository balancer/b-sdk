import { TestActions, Hex } from 'viem';
import {
    PublicWalletClient,
    Permit2,
    ChainId,
    Address,
} from '@/index';
import {
    setupPermit2ApprovalBuffer,
    setupPermit2SignatureBuffer,
} from './addLiquidityBufferTestFixture';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    BufferTest,
} from '../../v3/addLiquidity/addLiquidityTestConfig';
import {
    runAddLiquidityBufferTest,
    runAddLiquidityBufferTestWithSignature,
    TestAddLiquidityBufferConfig,
} from './addLiquidityBufferTestRunner';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

/**
 * Creates a test configuration for running a buffer add liquidity test.
 */
function createBufferTestConfig(
    test: BufferTest,
    context: string,
    fork: { rpcUrl: string } | undefined,
    contractToCall: Address,
    client: (PublicWalletClient & TestActions) | undefined,
    testAddress: Address,
): TestAddLiquidityBufferConfig {
    const addLiquidityBufferInput = {
        chainId: test.chainId,
        rpcUrl: fork?.rpcUrl || '',
        exactSharesToIssue: test.exactSharesToIssue,
    };

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

/**
 * Runs a single buffer test case.
 */
async function runBufferTestCase(
    test: BufferTest,
    context: string,
    fork: { rpcUrl: string } | undefined,
    contractToCall: Address,
    client: (PublicWalletClient & TestActions) | undefined,
    testAddress: Address,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    permit2?: Permit2,
): Promise<void> {
    const config = createBufferTestConfig(
        test,
        context,
        fork,
        contractToCall,
        client,
        testAddress,
    );

    // For permit2 signature approval context, always use runAddLiquidityBufferTestWithSignature
    // It will load permit2 from saved data if not provided
    if (context === TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL) {
        await runAddLiquidityBufferTestWithSignature(
            config,
            savedAddLiquidityTestData,
            addLiquidityTestData,
            permit2,
        );
    } else {
        await runAddLiquidityBufferTest(
            config,
            savedAddLiquidityTestData,
            addLiquidityTestData,
        );
    }
}

/**
 * Sets up and runs buffer test cases for a given context.
 * Buffer tests only have one test case (exactSharesToIssue).
 * This function should be called synchronously during describe block setup.
 * fork, client, and permit2 are accessed from the closure when tests actually run.
 */
export function setupAndRunBufferTestCases(
    test: BufferTest,
    context: string,
    getFork: () => { rpcUrl: string } | undefined,
    contractToCall: Address,
    getClient: () => (PublicWalletClient & TestActions) | undefined,
    testAddress: Address,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    getPermit2?: () => Permit2 | undefined,
): void {
    it('should handle buffer add liquidity', async () => {
        await runBufferTestCase(
            test,
            context,
            getFork(),
            contractToCall,
            getClient(),
            testAddress,
            savedAddLiquidityTestData,
            addLiquidityTestData,
            getPermit2?.(),
        );
    });
}

/**
 * Sets up permit2 signature approval context for buffer tests.
 */
export async function setupPermit2SignatureContextBuffer(
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    test: BufferTest,
    testAddress: Address,
    contractToCall: Address,
): Promise<{ permit2: Permit2; snapshot: Hex } | undefined> {
    if (!client || !fork) {
        return undefined;
    }

    return await setupPermit2SignatureBuffer(
        client,
        testAddress,
        test.bufferState,
        contractToCall,
    );
}

/**
 * Sets up permit2 direct approval context for buffer tests.
 */
export async function setupPermit2DirectApprovalContextBuffer(
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    snapshotPreApprove: Hex | undefined,
    test: BufferTest,
    testAddress: Address,
    contractToCall: Address,
): Promise<Hex | undefined> {
    if (!client || !fork || !snapshotPreApprove) {
        return undefined;
    }

    return await setupPermit2ApprovalBuffer(
        client,
        testAddress,
        test.bufferState,
        contractToCall,
        snapshotPreApprove,
    );
}

