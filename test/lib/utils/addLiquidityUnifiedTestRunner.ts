import { Address, Permit2, PublicWalletClient } from '@/index';
import { Hex, TestActions } from 'viem';
import { Test } from '../../v3/addLiquidity/addLiquidityTestConfig';
import {
    AddLiquidityTestStrategy,
    ContextSetupConfig,
} from './addLiquidityTestStrategy';

/**
 * Sets up and runs all test cases for a given context using the unified strategy pattern.
 * This function should be called synchronously during describe block setup.
 * fork, client, and permit2 are accessed from the closure when tests actually run.
 */
export function setupAndRunTestCases(
    test: Test,
    context: string,
    strategy: AddLiquidityTestStrategy,
    getFork: () => { rpcUrl: string } | undefined,
    contractToCall: Address,
    getClient: () => (PublicWalletClient & TestActions) | undefined,
    testAddress: Address,
    wethIsEth: boolean,
    savedAddLiquidityTestData: Record<string, unknown>,
    addLiquidityTestData: Record<string, unknown>,
    getPermit2?: () => Permit2 | undefined,
): void {
    const testCases = strategy.getTestCases();

    for (const testCase of testCases) {
        const description = testCase.getDescription();
        it(description, async () => {
            const fork = getFork();
            const client = getClient();
            const permit2 = getPermit2?.();

            const config = strategy.createTestConfig(
                test,
                context,
                testCase,
                fork,
                contractToCall,
                client,
                testAddress,
                wethIsEth,
            );

            await strategy.runTest(
                config,
                context,
                savedAddLiquidityTestData,
                addLiquidityTestData,
                permit2,
            );
        });
    }
}

/**
 * Sets up native input test context with snapshot management.
 * Returns undefined if not supported or if client/fork are not available.
 */
export async function setupNativeInputContext(
    test: Test,
    strategy: AddLiquidityTestStrategy,
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    testAddress: Address,
): Promise<Hex | undefined> {
    const config: ContextSetupConfig = {
        client,
        fork,
        test,
        testAddress,
        contractToCall: strategy.getContractAddress(test),
    };

    return await strategy.setupNativeInputContext(config);
}

/**
 * Sets up permit2 signature approval context.
 * Returns undefined if client/fork are not available.
 */
export async function setupPermit2SignatureContext(
    test: Test,
    strategy: AddLiquidityTestStrategy,
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    testAddress: Address,
    contractToCall: Address,
): Promise<{ permit2: Permit2; snapshot: Hex } | undefined> {
    const config: ContextSetupConfig = {
        client,
        fork,
        test,
        testAddress,
        contractToCall,
    };

    return await strategy.setupPermit2SignatureContext(config);
}

/**
 * Sets up permit2 direct approval context.
 * Returns undefined if client/fork/snapshotPreApprove are not available.
 */
export async function setupPermit2DirectApprovalContext(
    test: Test,
    strategy: AddLiquidityTestStrategy,
    client: (PublicWalletClient & TestActions) | undefined,
    fork: { rpcUrl: string } | undefined,
    snapshotPreApprove: Hex | undefined,
    testAddress: Address,
    contractToCall: Address,
): Promise<Hex | undefined> {
    const config: ContextSetupConfig = {
        client,
        fork,
        test,
        testAddress,
        contractToCall,
        snapshotPreApprove,
    };

    return await strategy.setupPermit2DirectApprovalContext(config);
}
