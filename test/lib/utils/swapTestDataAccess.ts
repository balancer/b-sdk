import { SwapKind, Permit2 } from '@/index';
import { serializePermit2 } from './swapTestDataHelpers';

/**
 * Type for the setTestData function used to save test data.
 */
export type SetTestDataFunction = typeof setTestData;

/**
 * Gets test data from the nested structure.
 * @param savedData - The saved test data (nested structure)
 * @param testName - Name of the test case
 * @param context - Test context (e.g., 'native input', 'permit2 direct approval')
 * @param subContext - Optional sub-context (e.g., 'native output', 'token output')
 * @param swapKind - The swap kind being tested
 * @returns The test data if found, undefined otherwise
 */
export function getTestData(
    savedData: Record<string, unknown>,
    testName: string,
    context: string,
    subContext: string | undefined,
    swapKind: SwapKind,
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

    // If subContext is provided, navigate to it
    if (subContext) {
        const subContextData = contextDataObj[subContext];
        if (!subContextData || typeof subContextData !== 'object') {
            return undefined;
        }
        const subContextDataObj = subContextData as Record<string, unknown>;
        const swapKindKey =
            swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut';
        return subContextDataObj[swapKindKey];
    }

    // No subContext, swapKind is directly under context
    const swapKindKey = swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut';
    return contextDataObj[swapKindKey];
}

/**
 * Sets test data in the nested structure.
 * @param testData - The test data object to update
 * @param testName - Name of the test case
 * @param context - Test context (e.g., 'native input', 'permit2 direct approval')
 * @param subContext - Optional sub-context (e.g., 'native output', 'token output')
 * @param swapKind - The swap kind being tested
 * @param data - The data to save (queryOutput, call, and optional permit2)
 * @param permit2 - Optional Permit2 to save (only for "permit2 signature approval" tests)
 */
export function setTestData(
    testData: Record<string, unknown>,
    testName: string,
    context: string,
    subContext: string | undefined,
    swapKind: SwapKind,
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

    const swapKindKey = swapKind === SwapKind.GivenIn ? 'GivenIn' : 'GivenOut';

    if (subContext) {
        if (!contextDataObj[subContext]) {
            contextDataObj[subContext] = {};
        }
        const subContextDataObj = contextDataObj[subContext] as Record<
            string,
            unknown
        >;
        subContextDataObj[swapKindKey] = dataToSave;
    } else {
        contextDataObj[swapKindKey] = dataToSave;
    }
}
