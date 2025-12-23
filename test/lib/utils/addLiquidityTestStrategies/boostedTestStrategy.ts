import { TestActions, Hex } from 'viem';
import {
    PublicWalletClient,
    Permit2,
    AddLiquidityKind,
    ChainId,
    Address,
    AddLiquidityBoostedUnbalancedInput,
    AddLiquidityBoostedProportionalInput,
} from '@/index';
import {
    setupPermit2ApprovalBoosted,
    setupPermit2SignatureBoosted,
    setupNativeInputBalancesBoosted,
} from '../addLiquidityBoostedTestFixture';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    Test,
    isBoostedTest,
} from '../../../v3/addLiquidity/addLiquidityTestConfig';
import {
    runAddLiquidityBoostedTest,
    runAddLiquidityBoostedTestWithSignature,
    TestAddLiquidityBoostedConfig,
} from '../addLiquidityBoostedTestRunner';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    AddLiquidityTestStrategy,
    TestCaseConfig,
    ContextSetupConfig,
} from '../addLiquidityTestStrategy';

/**
 * Test cases configuration for boosted add liquidity tests.
 */
const TEST_CASES: TestCaseConfig<
    AddLiquidityBoostedUnbalancedInput | AddLiquidityBoostedProportionalInput
>[] = [
    {
        kind: AddLiquidityKind.Unbalanced,
        getInput: (chainId, rpcUrl, test) => {
            if (!isBoostedTest(test)) {
                throw new Error('Expected BoostedTest');
            }
            return {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn: test.unbalancedAmounts,
            };
        },
        getDescription: () => `should handle ${AddLiquidityKind.Unbalanced} add liquidity`,
    },
    {
        kind: AddLiquidityKind.Proportional,
        proportionalType: 'bptOut',
        getInput: (chainId, rpcUrl, test) => {
            if (!isBoostedTest(test)) {
                throw new Error('Expected BoostedTest');
            }
            return {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
                referenceAmount: test.proportionalBptOut,
                tokensIn: test.proportionalTokensIn,
            };
        },
        getDescription: () =>
            `should handle Proportional add liquidity with bptOut`,
    },
    {
        kind: AddLiquidityKind.Proportional,
        proportionalType: 'amountIn',
        getInput: (chainId, rpcUrl, test) => {
            if (!isBoostedTest(test)) {
                throw new Error('Expected BoostedTest');
            }
            return {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
                referenceAmount: test.proportionalAmountIn,
                tokensIn: test.proportionalTokensIn,
            };
        },
        getDescription: () =>
            `should handle Proportional add liquidity with amountIn`,
    },
];

/**
 * Strategy implementation for boosted add liquidity tests.
 */
export class BoostedTestStrategy implements AddLiquidityTestStrategy {
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
    ): TestAddLiquidityBoostedConfig {
        if (!isBoostedTest(test)) {
            throw new Error('Expected BoostedTest');
        }

        const addLiquidityBoostedInput = testCase.getInput(
            test.chainId,
            fork?.rpcUrl || '',
            test,
        ) as
            | AddLiquidityBoostedUnbalancedInput
            | AddLiquidityBoostedProportionalInput;

        return {
            chainId: test.chainId,
            boostedPoolState: test.boostedPoolState,
            addLiquidityBoostedInput,
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

    async runTest(
        config: unknown,
        context: string,
        savedData: Record<string, unknown>,
        newData: Record<string, unknown>,
        permit2?: Permit2,
    ): Promise<void> {
        const testConfig = config as TestAddLiquidityBoostedConfig;

        if (context === TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL) {
            await runAddLiquidityBoostedTestWithSignature(
                testConfig,
                savedData,
                newData,
                permit2,
            );
        } else {
            await runAddLiquidityBoostedTest(testConfig, savedData, newData);
        }
    }

    async setupNativeInputContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        if (!config.client || !config.fork) {
            return undefined;
        }

        if (!isBoostedTest(config.test)) {
            throw new Error('Expected BoostedTest');
        }

        return await setupNativeInputBalancesBoosted(
            config.client,
            config.testAddress,
            config.test.boostedPoolState,
            config.test.chainId,
        );
    }

    async setupPermit2SignatureContext(
        config: ContextSetupConfig,
    ): Promise<{ permit2: Permit2; snapshot: Hex } | undefined> {
        if (!config.client || !config.fork) {
            return undefined;
        }

        if (!isBoostedTest(config.test)) {
            throw new Error('Expected BoostedTest');
        }

        return await setupPermit2SignatureBoosted(
            config.client,
            config.testAddress,
            config.test.boostedPoolState,
            config.contractToCall,
        );
    }

    async setupPermit2DirectApprovalContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        if (!config.client || !config.fork || !config.snapshotPreApprove) {
            return undefined;
        }

        if (!isBoostedTest(config.test)) {
            throw new Error('Expected BoostedTest');
        }

        return await setupPermit2ApprovalBoosted(
            config.client,
            config.testAddress,
            config.test.boostedPoolState,
            config.contractToCall,
            config.snapshotPreApprove,
        );
    }

    getContractAddress(test: Test): Address {
        if (!isBoostedTest(test)) {
            throw new Error('Expected BoostedTest');
        }
        return AddressProvider.CompositeLiquidityRouter(test.chainId);
    }

    supportsNativeInput(test: Test): boolean {
        return isBoostedTest(test) && (test.isNativeIn ?? false);
    }
}

