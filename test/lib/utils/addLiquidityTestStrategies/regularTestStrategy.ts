import { TestActions, Hex } from 'viem';
import {
    PublicWalletClient,
    Permit2,
    AddLiquidityKind,
    ChainId,
    Address,
    AddLiquidityUnbalancedInput,
    AddLiquiditySingleTokenInput,
    AddLiquidityProportionalInput,
} from '@/index';
import {
    setupPermit2Approval,
    setupPermit2Signature,
    setupNativeInputBalances,
} from '../addLiquidityTestFixture';
import {
    TEST_CONSTANTS,
    TEST_CONTEXTS,
    Test,
    isRegularTest,
} from '../../../v3/addLiquidity/addLiquidityTestConfig';
import {
    runAddLiquidityTest,
    runAddLiquidityTestWithSignature,
    TestAddLiquidityConfig,
} from '../addLiquidityTestRunner';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    AddLiquidityTestStrategy,
    TestCaseConfig,
    ContextSetupConfig,
} from '../addLiquidityTestStrategy';

/**
 * Test cases configuration for regular add liquidity tests.
 */
const TEST_CASES: TestCaseConfig<
    | AddLiquidityUnbalancedInput
    | AddLiquiditySingleTokenInput
    | AddLiquidityProportionalInput
>[] = [
    {
        kind: AddLiquidityKind.Unbalanced,
        getInput: (chainId, rpcUrl, test) => {
            if (!isRegularTest(test)) {
                throw new Error('Expected RegularTest');
            }
            return {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn: test.unbalancedAmounts,
            };
        },
        getDescription: () =>
            `should handle ${AddLiquidityKind.Unbalanced} add liquidity`,
    },
    {
        kind: AddLiquidityKind.SingleToken,
        getInput: (chainId, rpcUrl, test) => {
            if (!isRegularTest(test)) {
                throw new Error('Expected RegularTest');
            }
            return {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.SingleToken,
                bptOut: test.singleTokenBptOut,
                tokenIn: test.singleTokenIn,
            };
        },
        getDescription: () =>
            `should handle ${AddLiquidityKind.SingleToken} add liquidity`,
    },
    {
        kind: AddLiquidityKind.Proportional,
        proportionalType: 'bptOut',
        getInput: (chainId, rpcUrl, test) => {
            if (!isRegularTest(test)) {
                throw new Error('Expected RegularTest');
            }
            return {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
                referenceAmount: test.proportionalBptOut,
            };
        },
        getDescription: () =>
            'should handle Proportional add liquidity with bptOut',
    },
    {
        kind: AddLiquidityKind.Proportional,
        proportionalType: 'amountIn',
        getInput: (chainId, rpcUrl, test) => {
            if (!isRegularTest(test)) {
                throw new Error('Expected RegularTest');
            }
            return {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
                referenceAmount: test.proportionalAmountIn,
            };
        },
        getDescription: () =>
            'should handle Proportional add liquidity with amountIn',
    },
];

/**
 * Strategy implementation for regular add liquidity tests.
 */
export class RegularTestStrategy implements AddLiquidityTestStrategy {
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
    ): TestAddLiquidityConfig {
        if (!isRegularTest(test)) {
            throw new Error('Expected RegularTest');
        }

        const addLiquidityInput = testCase.getInput(
            test.chainId,
            fork?.rpcUrl || '',
            test,
        ) as
            | AddLiquidityUnbalancedInput
            | AddLiquiditySingleTokenInput
            | AddLiquidityProportionalInput;

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

    async runTest(
        config: unknown,
        context: string,
        savedData: Record<string, unknown>,
        newData: Record<string, unknown>,
        permit2?: Permit2,
    ): Promise<void> {
        const testConfig = config as TestAddLiquidityConfig;

        if (context === TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL) {
            await runAddLiquidityTestWithSignature(
                testConfig,
                savedData,
                newData,
                permit2,
            );
        } else {
            await runAddLiquidityTest(testConfig, savedData, newData);
        }
    }

    async setupNativeInputContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        if (!config.client || !config.fork) {
            return undefined;
        }

        if (!isRegularTest(config.test)) {
            throw new Error('Expected RegularTest');
        }

        return await setupNativeInputBalances(
            config.client,
            config.testAddress,
            config.test.poolState,
            config.test.chainId,
        );
    }

    async setupPermit2SignatureContext(
        config: ContextSetupConfig,
    ): Promise<{ permit2: Permit2; snapshot: Hex } | undefined> {
        if (!config.client || !config.fork) {
            return undefined;
        }

        if (!isRegularTest(config.test)) {
            throw new Error('Expected RegularTest');
        }

        return await setupPermit2Signature(
            config.client,
            config.testAddress,
            config.test.poolState,
            config.contractToCall,
        );
    }

    async setupPermit2DirectApprovalContext(
        config: ContextSetupConfig,
    ): Promise<Hex | undefined> {
        if (!config.client || !config.fork || !config.snapshotPreApprove) {
            return undefined;
        }

        if (!isRegularTest(config.test)) {
            throw new Error('Expected RegularTest');
        }

        return await setupPermit2Approval(
            config.client,
            config.testAddress,
            config.test.poolState,
            config.contractToCall,
            config.snapshotPreApprove,
        );
    }

    getContractAddress(test: Test): Address {
        if (!isRegularTest(test)) {
            throw new Error('Expected RegularTest');
        }
        return AddressProvider.Router(test.chainId);
    }

    supportsNativeInput(test: Test): boolean {
        return isRegularTest(test) && test.isNativeIn;
    }
}
