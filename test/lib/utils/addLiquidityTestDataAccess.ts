import { AddLiquidityKind, Permit2 } from '@/index';
import { serializePermit2 } from './addLiquidityTestDataHelpers';

/**
 * Type for the setTestData function used to save test data.
 */
export type SetTestDataFunction = typeof setTestData;

/**
 * Generates the key for accessing test data based on add liquidity kind and proportional type.
 * @param addLiquidityKind - The add liquidity kind
 * @param proportionalType - Optional type for proportional tests ('bptOut' or 'amountIn')
 * @returns The key string for accessing test data
 */
function getTestDataKey(
    addLiquidityKind: AddLiquidityKind,
    proportionalType?: 'bptOut' | 'amountIn',
): string {
    if (addLiquidityKind === AddLiquidityKind.Proportional) {
        if (!proportionalType) {
            throw new Error(
                'proportionalType is required for Proportional add liquidity kind',
            );
        }
        return `Proportional_${proportionalType}`;
    }
    return addLiquidityKind;
}

/**
 * Gets test data from the nested structure.
 * @param savedData - The saved test data (nested structure)
 * @param testName - Name of the test case
 * @param context - Test context (e.g., 'native input', 'permit2 direct approval')
 * @param addLiquidityKind - The add liquidity kind being tested
 * @param proportionalType - Optional type for proportional tests ('bptOut' or 'amountIn')
 * @returns The test data if found, undefined otherwise
 */
export function getTestData(
    savedData: Record<string, unknown>,
    testName: string,
    context: string,
    addLiquidityKind: AddLiquidityKind,
    proportionalType?: 'bptOut' | 'amountIn',
): unknown {
    const testData = savedData[testName];
    if (!testData || typeof testData !== 'object') {
        return undefined;
    }

    const testDataObj = testData as Record<string, unknown>;
    const contextData = testDataObj[context];
    if (!contextData || typeof contextData !== 'object') {
        return undefined;
    }

    const contextDataObj = contextData as Record<string, unknown>;

    // Determine the key based on addLiquidityKind
    if (
        addLiquidityKind === AddLiquidityKind.Proportional &&
        !proportionalType
    ) {
        return undefined;
    }

    const key = getTestDataKey(addLiquidityKind, proportionalType);
    return contextDataObj[key];
}

/**
 * Sets test data in the nested structure.
 * @param testData - The test data object to update
 * @param testName - Name of the test case
 * @param context - Test context (e.g., 'native input', 'permit2 direct approval')
 * @param addLiquidityKind - The add liquidity kind being tested
 * @param proportionalType - Optional type for proportional tests ('bptOut' or 'amountIn')
 * @param data - The data to save (queryOutput, call, and optional permit2)
 * @param permit2 - Optional Permit2 to save (only for "permit2 signature approval" tests)
 */
export function setTestData(
    testData: Record<string, unknown>,
    testName: string,
    context: string,
    addLiquidityKind: AddLiquidityKind,
    proportionalType: 'bptOut' | 'amountIn' | undefined,
    data: { queryOutput: unknown; call: unknown },
    permit2?: Permit2,
): void {
    // Include permit2 in data if provided
    const dataToSave = permit2
        ? { ...data, permit2: serializePermit2(permit2) }
        : data;

    if (!testData[testName]) {
        testData[testName] = {};
    }
    const testDataObj = testData[testName] as Record<string, unknown>;

    if (!testDataObj[context]) {
        testDataObj[context] = {};
    }
    const contextDataObj = testDataObj[context] as Record<string, unknown>;

    // Determine the key based on addLiquidityKind
    const key = getTestDataKey(addLiquidityKind, proportionalType);
    contextDataObj[key] = dataToSave;
}

