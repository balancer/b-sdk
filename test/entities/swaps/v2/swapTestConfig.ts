import { ChainId, Path, Slippage } from '@/index';
import { ANVIL_NETWORKS, NetworkSetup } from 'test/anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import { hasSavedTestData } from 'test/lib/utils/swapTestDataHelpers';

// Test configuration constants for V2
export const TEST_CONSTANTS_V2 = {
    ANVIL_TEST_ADDRESS: '0x831eFb058FEdCd16Cd6b9174206DFe452dDCe8C3', // address from mnemonic "you twelve word test phrase boat cat like this example dog car"
    BALANCE_MULTIPLIER: 10n, // For setting token balances
    slippage: Slippage.fromPercentage('0.1'),
    deadline: 999999999999999999n,
    SWAP_TEST_DATA_FILENAME: 'swapTestData.json',
    defaultOutputTest: {
        testExactOutAmount: true,
        percentage: 0,
    },
} as const;

export type NativePosition = 'input' | 'output' | 'none';

export type TestV2 = {
    name: string;
    chainId: ChainId;
    anvilNetwork: NetworkSetup;
    path: Path;
    isNative: NativePosition;
    blockNumber?: bigint;
    outputTest?: {
        testExactOutAmount: boolean;
        percentage: number;
    };
};

export const testsV2: TestV2[] = [
    {
        name: 'Single Swap: BAL[swap]WETH',
        chainId: ChainId.MAINNET,
        anvilNetwork: ANVIL_NETWORKS.MAINNET,
        path: {
            protocolVersion: 2,
            tokens: [
                {
                    address: TOKENS[ChainId.MAINNET].BAL.address,
                    decimals: TOKENS[ChainId.MAINNET].BAL.decimals,
                },
                {
                    address: TOKENS[ChainId.MAINNET].WETH.address,
                    decimals: TOKENS[ChainId.MAINNET].WETH.decimals,
                },
            ],
            pools: [
                '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
            ],
            inputAmountRaw: 100000000000n,
            outputAmountRaw: 100000n,
        },
        isNative: 'output',
    },
    {
        name: 'Single Swap: WETH[swap]BAL',
        chainId: ChainId.MAINNET,
        anvilNetwork: ANVIL_NETWORKS.MAINNET,
        path: {
            protocolVersion: 2,
            tokens: [
                {
                    address: TOKENS[ChainId.MAINNET].WETH.address,
                    decimals: TOKENS[ChainId.MAINNET].WETH.decimals,
                },
                {
                    address: TOKENS[ChainId.MAINNET].BAL.address,
                    decimals: TOKENS[ChainId.MAINNET].BAL.decimals,
                },
            ],
            pools: [
                '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
            ],
            inputAmountRaw: 10000000000n,
            outputAmountRaw: 1000000000000n,
        },
        isNative: 'input',
    },
];

/**
 * Checks if all tests for a given V2 test configuration have valid saved data.
 * Valid saved data must be an object with both 'queryOutput' and 'call' properties.
 * Checks the nested structure: testName > context > swapKind
 * Always checks "token swap" context, plus conditionally checks native contexts based on isNative value.
 * @param test - The V2 test configuration
 * @param savedData - Nested record of saved test data
 * @returns True if all tests have valid saved data, false otherwise
 */
export function allTestsHaveSavedDataV2(
    test: Pick<TestV2, 'name' | 'isNative'>,
    savedData: Record<string, unknown>,
): boolean {
    const testData = savedData[test.name];
    if (!testData || typeof testData !== 'object') {
        return false;
    }

    const testDataObj = testData as Record<string, unknown>;

    // Always check "token swap" context
    const tokenSwapData = testDataObj['token swap'];
    if (
        !tokenSwapData ||
        typeof tokenSwapData !== 'object' ||
        !hasSavedTestData((tokenSwapData as Record<string, unknown>).GivenIn) ||
        !hasSavedTestData((tokenSwapData as Record<string, unknown>).GivenOut)
    ) {
        return false;
    }

    // Additionally check native contexts based on isNative value
    if (test.isNative === 'input') {
        const nativeInputData = testDataObj['native input'];
        if (
            !nativeInputData ||
            typeof nativeInputData !== 'object' ||
            !hasSavedTestData(
                (nativeInputData as Record<string, unknown>).GivenIn,
            ) ||
            !hasSavedTestData(
                (nativeInputData as Record<string, unknown>).GivenOut,
            )
        ) {
            return false;
        }
    } else if (test.isNative === 'output') {
        const nativeOutputData = testDataObj['native output'];
        if (
            !nativeOutputData ||
            typeof nativeOutputData !== 'object' ||
            !hasSavedTestData(
                (nativeOutputData as Record<string, unknown>).GivenIn,
            ) ||
            !hasSavedTestData(
                (nativeOutputData as Record<string, unknown>).GivenOut,
            )
        ) {
            return false;
        }
    }

    return true;
}
