import { TestActions, Hex } from 'viem';
import {
    PublicWalletClient,
    Permit2,
    AddLiquidityKind,
    ChainId,
    Address,
} from '@/index';
import { Test } from '../../v3/addLiquidity/addLiquidityTestConfig';

/**
 * Configuration for a single test case.
 * TInput is the input type specific to each test type (e.g., AddLiquidityInput, AddLiquidityBufferInput).
 */
export interface TestCaseConfig<TInput = unknown> {
    kind: AddLiquidityKind;
    proportionalType?: 'bptOut' | 'amountIn';
    getInput: (chainId: ChainId, rpcUrl: string, test: Test) => TInput;
    getDescription: () => string;
}

/**
 * Configuration for context setup functions.
 */
export interface ContextSetupConfig {
    client: (PublicWalletClient & TestActions) | undefined;
    fork: { rpcUrl: string } | undefined;
    test: Test;
    testAddress: Address;
    contractToCall: Address;
    snapshotPreApprove?: Hex | undefined;
}

/**
 * Strategy interface for add liquidity test execution.
 * Each test type (regular, buffer, boosted, nested) implements this interface.
 */
export interface AddLiquidityTestStrategy {
    /**
     * Returns the test cases for this strategy.
     */
    getTestCases(): TestCaseConfig[];

    /**
     * Creates a test configuration object for running a test case.
     */
    createTestConfig(
        test: Test,
        context: string,
        testCase: TestCaseConfig,
        fork: { rpcUrl: string } | undefined,
        contractToCall: Address,
        client: (PublicWalletClient & TestActions) | undefined,
        testAddress: Address,
        wethIsEth: boolean,
    ): unknown;

    /**
     * Runs a test case with the given configuration.
     */
    runTest(
        config: unknown,
        context: string,
        savedData: Record<string, unknown>,
        newData: Record<string, unknown>,
        permit2?: Permit2,
    ): Promise<void>;

    /**
     * Sets up native input context (if supported).
     * Returns undefined if not supported or if client/fork are not available.
     */
    setupNativeInputContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined>;

    /**
     * Sets up permit2 signature approval context.
     * Returns undefined if client/fork are not available.
     */
    setupPermit2SignatureContext(
        config: ContextSetupConfig,
    ): Promise<{ permit2: Permit2; snapshot: Hex } | undefined>;

    /**
     * Sets up permit2 direct approval context.
     * Returns undefined if client/fork/snapshotPreApprove are not available.
     */
    setupPermit2DirectApprovalContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined>;

    /**
     * Gets the contract address to call for this test type.
     */
    getContractAddress(test: Test): Address;

    /**
     * Checks if this test type supports native input.
     */
    supportsNativeInput(test: Test): boolean;
}

