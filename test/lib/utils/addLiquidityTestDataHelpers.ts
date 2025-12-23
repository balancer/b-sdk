import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import {
    AddLiquidityBoostedQueryOutput,
    AddLiquidityBufferBuildCallOutput,
    AddLiquidityBufferQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityKind,
    AddLiquidityNestedBuildCallOutput,
    AddLiquidityNestedQueryOutputV3,
    AddLiquidityQueryOutput,
    Address,
    Hex,
    TokenAmount,
} from '@/index';
import { TEST_CONTEXTS } from '../../v3/addLiquidity/addLiquidityTestConfig';
import {
    deserializePermit2,
    deserializeTokenAmount,
    serializePermit2,
    serializeTokenAmount,
} from './swapTestDataHelpers';

/**
 * Serializes an AddLiquidityQueryOutput to JSON-serializable format.
 * @param queryOutput - The AddLiquidityQueryOutput to serialize
 * @returns Serialized query output data
 */
export function serializeQueryOutput(
    queryOutput: AddLiquidityQueryOutput,
): unknown {
    const base = {
        poolType: queryOutput.poolType,
        poolId: queryOutput.poolId,
        addLiquidityKind: queryOutput.addLiquidityKind,
        bptOut: serializeTokenAmount(queryOutput.bptOut),
        amountsIn: queryOutput.amountsIn.map(serializeTokenAmount),
        chainId: queryOutput.chainId,
        tokenInIndex: queryOutput.tokenInIndex,
        protocolVersion: queryOutput.protocolVersion,
        to: queryOutput.to,
    };

    // Add userData for V3
    if (queryOutput.protocolVersion === 3 && 'userData' in queryOutput) {
        return {
            ...base,
            userData: queryOutput.userData,
        };
    }

    // Add bptIndex for V2 ComposableStable
    if (
        queryOutput.protocolVersion === 2 &&
        'bptIndex' in queryOutput &&
        queryOutput.bptIndex !== undefined
    ) {
        return {
            ...base,
            bptIndex: queryOutput.bptIndex,
        };
    }

    return base;
}

/**
 * Deserializes an AddLiquidityQueryOutput from JSON.
 * @param serialized - The serialized query output data
 * @returns An AddLiquidityQueryOutput instance
 * @throws Error if the data structure is invalid
 */
export function deserializeQueryOutput(
    serialized: unknown,
): AddLiquidityQueryOutput {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized AddLiquidityQueryOutput: expected object, got ${typeof serialized}`,
        );
    }

    const data = serialized as {
        poolType?: string;
        poolId?: string;
        addLiquidityKind?: string;
        bptOut?: unknown;
        amountsIn?: unknown[];
        chainId?: number;
        tokenInIndex?: number;
        protocolVersion?: number;
        to?: string;
        userData?: string;
        bptIndex?: number;
    };

    // Validate required fields
    if (!data.poolType || typeof data.poolType !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityQueryOutput: missing or invalid "poolType"',
        );
    }

    if (!data.poolId || typeof data.poolId !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityQueryOutput: missing or invalid "poolId"',
        );
    }

    if (
        !data.addLiquidityKind ||
        !Object.values(AddLiquidityKind).includes(
            data.addLiquidityKind as AddLiquidityKind,
        )
    ) {
        throw new Error(
            `Invalid serialized AddLiquidityQueryOutput: invalid "addLiquidityKind", got ${data.addLiquidityKind}`,
        );
    }

    if (!data.bptOut) {
        throw new Error(
            'Invalid serialized AddLiquidityQueryOutput: missing "bptOut"',
        );
    }

    if (!Array.isArray(data.amountsIn)) {
        throw new Error(
            'Invalid serialized AddLiquidityQueryOutput: "amountsIn" must be an array',
        );
    }

    if (typeof data.chainId !== 'number') {
        throw new Error(
            'Invalid serialized AddLiquidityQueryOutput: missing or invalid "chainId"',
        );
    }

    if (
        typeof data.protocolVersion !== 'number' ||
        (data.protocolVersion !== 1 &&
            data.protocolVersion !== 2 &&
            data.protocolVersion !== 3)
    ) {
        throw new Error(
            'Invalid serialized AddLiquidityQueryOutput: missing or invalid "protocolVersion"',
        );
    }

    if (!data.to || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityQueryOutput: missing or invalid "to"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized AddLiquidityQueryOutput: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    const base = {
        poolType: data.poolType,
        poolId: data.poolId as Hex,
        addLiquidityKind: data.addLiquidityKind as AddLiquidityKind,
        bptOut: deserializeTokenAmount(data.bptOut),
        amountsIn: data.amountsIn.map(deserializeTokenAmount),
        chainId: data.chainId,
        tokenInIndex: data.tokenInIndex,
        protocolVersion: data.protocolVersion as 1 | 2 | 3,
        to: data.to as Address,
    };

    // Add userData for V3
    if (data.protocolVersion === 3) {
        return {
            ...base,
            userData: (data.userData as Hex) || '0x',
        } as AddLiquidityQueryOutput;
    }

    // Add bptIndex for V2 ComposableStable
    if (data.protocolVersion === 2 && data.bptIndex !== undefined) {
        return {
            ...base,
            bptIndex: data.bptIndex,
        };
    }

    return base;
}

/**
 * Serializes an AddLiquidityBuildCallOutput to JSON-serializable format.
 * @param call - The AddLiquidityBuildCallOutput to serialize
 * @returns Serialized call data
 */
export function serializeCall(call: AddLiquidityBuildCallOutput): unknown {
    return {
        to: call.to,
        callData: call.callData,
        value: call.value.toString(),
        minBptOut: serializeTokenAmount(call.minBptOut),
        maxAmountsIn: call.maxAmountsIn.map(serializeTokenAmount),
    };
}

/**
 * Deserializes an AddLiquidityBuildCallOutput from JSON.
 * @param serialized - The serialized call data
 * @returns An AddLiquidityBuildCallOutput instance
 * @throws Error if the data structure is invalid
 */
export function deserializeCall(
    serialized: unknown,
): AddLiquidityBuildCallOutput {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized AddLiquidityBuildCallOutput: expected object, got ${typeof serialized}`,
        );
    }

    const data = serialized as {
        to?: string;
        callData?: string;
        value?: string;
        minBptOut?: unknown;
        maxAmountsIn?: unknown[];
    };

    if (!data.to || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBuildCallOutput: missing or invalid "to"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized AddLiquidityBuildCallOutput: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    if (!data.callData || typeof data.callData !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBuildCallOutput: missing or invalid "callData"',
        );
    }

    if (!data.value || typeof data.value !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBuildCallOutput: missing or invalid "value"',
        );
    }

    let valueBigInt: bigint;
    try {
        valueBigInt = BigInt(data.value);
    } catch {
        throw new Error(
            `Invalid serialized AddLiquidityBuildCallOutput: value "${data.value}" cannot be converted to BigInt`,
        );
    }

    if (valueBigInt < 0n) {
        throw new Error(
            `Invalid serialized AddLiquidityBuildCallOutput: value cannot be negative, got ${data.value}`,
        );
    }

    if (!data.minBptOut) {
        throw new Error(
            'Invalid serialized AddLiquidityBuildCallOutput: missing "minBptOut"',
        );
    }

    if (!Array.isArray(data.maxAmountsIn)) {
        throw new Error(
            'Invalid serialized AddLiquidityBuildCallOutput: "maxAmountsIn" must be an array',
        );
    }

    return {
        to: data.to as Address,
        callData: data.callData as Hex,
        value: valueBigInt,
        minBptOut: deserializeTokenAmount(data.minBptOut),
        maxAmountsIn: data.maxAmountsIn.map(deserializeTokenAmount),
    };
}

/**
 * Type representing saved add liquidity test data with serialized query output and call data.
 * permit2 is optional and only present for "permit2 signature approval" tests.
 */
export type SavedAddLiquidityTestData = {
    queryOutput: unknown;
    call: unknown;
    permit2?: unknown;
};

/**
 * Type representing saved buffer add liquidity test data with serialized query output and call data.
 * permit2 is optional and only present for "permit2 signature approval" tests.
 */
export type SavedAddLiquidityBufferTestData = {
    queryOutput: unknown;
    call: unknown;
    permit2?: unknown;
};

/**
 * Type representing saved boosted add liquidity test data with serialized query output and call data.
 * permit2 is optional and only present for "permit2 signature approval" tests.
 */
export type SavedAddLiquidityBoostedTestData = {
    queryOutput: unknown;
    call: unknown;
    permit2?: unknown;
};

export type SavedAddLiquidityNestedTestData = {
    queryOutput: unknown;
    call: unknown;
    permit2?: unknown;
};

/**
 * Type guard to check if data is valid saved add liquidity test data.
 * @param data - Data to check
 * @returns True if data is valid SavedAddLiquidityTestData, false otherwise
 */
export function hasSavedTestData(
    data: unknown,
): data is SavedAddLiquidityTestData {
    if (data === undefined || data === null || typeof data !== 'object') {
        return false;
    }

    const obj = data as Record<string, unknown>;

    // Check top-level structure
    if (!('queryOutput' in obj) || !('call' in obj)) {
        return false;
    }

    return true;
}

/**
 * Loads add liquidity test data from a JSON file.
 * Returns an empty object if the file doesn't exist or can't be read.
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data as a record, or empty object on error
 */
export function loadAddLiquidityTestData(
    filePath: string,
): Record<string, unknown> {
    try {
        const fileContent = readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch {
        // File doesn't exist or can't be read - treat as empty object
        return {};
    }
}

/**
 * Deep merges two objects, preserving nested structure.
 * @param target - Target object to merge into
 * @param source - Source object to merge from
 * @returns Merged object
 */
function deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): Record<string, unknown> {
    const result = { ...target };
    for (const key in source) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === 'object' &&
            !Array.isArray(target[key])
        ) {
            result[key] = deepMerge(
                target[key] as Record<string, unknown>,
                source[key] as Record<string, unknown>,
            );
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

/**
 * Saves add liquidity test data to a JSON file.
 * Deep merges existingData with newData (existingData takes precedence for conflicts).
 * Logs errors but doesn't throw.
 * @param filePath - Path to the JSON file
 * @param existingData - Existing test data to preserve
 * @param newData - New test data to add (nested structure)
 */
export async function saveAddLiquidityTestData(
    filePath: string,
    existingData: Record<string, unknown>,
    newData: Record<string, unknown>,
): Promise<void> {
    try {
        // Deep merge saved data with new test data (preserves existing, adds new)
        const mergedData = deepMerge(existingData, newData);

        // Write the merged data to file
        await writeFile(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');
        console.log(`Add liquidity test data written to ${filePath}`);
    } catch (error) {
        console.error('Failed to write add liquidity test data:', error);
        // Don't throw - we don't want to fail tests if file write fails
    }
}

/**
 * Type for test configuration used to check saved data.
 */
type TestConfig = {
    name: string;
    isNativeIn?: boolean;
    testType?: 'regular' | 'buffer' | 'boosted' | 'nested';
};

/**
 * Checks if a context has all required test data saved for regular tests.
 * @param contextData - The context data object
 * @returns True if all required tests have saved data, false otherwise
 */
function hasAllContextTests(contextData: unknown): boolean {
    if (!contextData || typeof contextData !== 'object') {
        return false;
    }

    const contextObj = contextData as Record<string, unknown>;
    const requiredTests = [
        'Unbalanced',
        'SingleToken',
        'Proportional_bptOut',
        'Proportional_amountIn',
    ];

    return requiredTests.every((test) => hasSavedTestData(contextObj[test]));
}

/**
 * Checks if a context has buffer test data saved.
 * @param contextData - The context data object
 * @returns True if buffer test has saved data, false otherwise
 */
function hasBufferContextTest(contextData: unknown): boolean {
    if (!contextData || typeof contextData !== 'object') {
        return false;
    }

    const contextObj = contextData as Record<string, unknown>;
    return hasSavedTestData(contextObj.Buffer);
}

function hasNestedContextTest(contextData: unknown): boolean {
    if (!contextData || typeof contextData !== 'object') {
        return false;
    }

    const contextObj = contextData as Record<string, unknown>;
    return hasSavedTestData(contextObj.Nested);
}

/**
 * Checks if a context has all required boosted test data saved.
 * @param contextData - The context data object
 * @returns True if all required tests have saved data, false otherwise
 */
function hasAllBoostedContextTests(contextData: unknown): boolean {
    if (!contextData || typeof contextData !== 'object') {
        return false;
    }

    const contextObj = contextData as Record<string, unknown>;
    const requiredTests = [
        'Unbalanced',
        'Proportional_bptOut',
        'Proportional_amountIn',
    ];

    return requiredTests.every((test) => hasSavedTestData(contextObj[test]));
}

/**
 * Checks if all tests for a given test configuration have valid saved data.
 * @param test - The test configuration
 * @param savedData - Nested record of saved test data
 * @returns True if all tests have valid saved data, false otherwise
 */
export function allTestsHaveSavedData(
    test: TestConfig,
    savedData: Record<string, unknown>,
): boolean {
    const testData = savedData[test.name];
    if (!testData || typeof testData !== 'object') {
        return false;
    }

    const testDataObj = testData as Record<string, unknown>;

    // Buffer tests only have permit2 contexts
    if (test.testType === 'buffer') {
        // Check permit2 direct approval tests
        if (
            !hasBufferContextTest(
                testDataObj[TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL],
            )
        ) {
            return false;
        }

        // Check permit2 signature approval tests
        if (
            !hasBufferContextTest(
                testDataObj[TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL],
            )
        ) {
            return false;
        }

        return true;
    }

    // Boosted tests only have permit2 contexts (and optionally native input)
    if (test.testType === 'boosted') {
        // Check permit2 direct approval tests
        if (
            !hasAllBoostedContextTests(
                testDataObj[TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL],
            )
        ) {
            return false;
        }

        // Check permit2 signature approval tests
        if (
            !hasAllBoostedContextTests(
                testDataObj[TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL],
            )
        ) {
            return false;
        }

        // Boosted tests with native input also need native input context
        if (test.isNativeIn) {
            if (
                !hasAllBoostedContextTests(
                    testDataObj[TEST_CONTEXTS.NATIVE_INPUT],
                )
            ) {
                return false;
            }
        }

        return true;
    }

    // Nested tests only have permit2 contexts (and optionally native input)
    if (test.testType === 'nested') {
        // Check permit2 direct approval tests
        if (
            !hasNestedContextTest(
                testDataObj[TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL],
            )
        ) {
            return false;
        }

        // Check permit2 signature approval tests
        if (
            !hasNestedContextTest(
                testDataObj[TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL],
            )
        ) {
            return false;
        }

        // Nested tests with native input also need native input context
        if (test.isNativeIn) {
            if (
                !hasNestedContextTest(testDataObj[TEST_CONTEXTS.NATIVE_INPUT])
            ) {
                return false;
            }
        }

        return true;
    }

    // Regular tests
    // Check native input tests (if applicable)
    if (test.isNativeIn) {
        if (!hasAllContextTests(testDataObj[TEST_CONTEXTS.NATIVE_INPUT])) {
            return false;
        }
    }

    // Check permit2 direct approval tests
    if (
        !hasAllContextTests(testDataObj[TEST_CONTEXTS.PERMIT2_DIRECT_APPROVAL])
    ) {
        return false;
    }

    // Check permit2 signature approval tests
    if (
        !hasAllContextTests(
            testDataObj[TEST_CONTEXTS.PERMIT2_SIGNATURE_APPROVAL],
        )
    ) {
        return false;
    }

    return true;
}

/**
 * Serializes an AddLiquidityBufferQueryOutput to JSON-serializable format.
 * @param queryOutput - The AddLiquidityBufferQueryOutput to serialize
 * @returns Serialized query output data
 */
export function serializeBufferQueryOutput(
    queryOutput: AddLiquidityBufferQueryOutput,
): unknown {
    return {
        exactSharesToIssue: queryOutput.exactSharesToIssue.toString(),
        wrappedAmountIn: serializeTokenAmount(queryOutput.wrappedAmountIn),
        underlyingAmountIn: serializeTokenAmount(
            queryOutput.underlyingAmountIn,
        ),
        chainId: queryOutput.chainId,
        protocolVersion: queryOutput.protocolVersion,
        to: queryOutput.to,
    };
}

/**
 * Deserializes an AddLiquidityBufferQueryOutput from JSON.
 * @param serialized - The serialized query output data
 * @returns An AddLiquidityBufferQueryOutput instance
 * @throws Error if the data structure is invalid
 */
export function deserializeBufferQueryOutput(
    serialized: unknown,
): AddLiquidityBufferQueryOutput {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized AddLiquidityBufferQueryOutput: expected object, got ${typeof serialized}`,
        );
    }

    const data = serialized as {
        exactSharesToIssue?: string;
        wrappedAmountIn?: unknown;
        underlyingAmountIn?: unknown;
        chainId?: number;
        protocolVersion?: number;
        to?: string;
    };

    if (
        !data.exactSharesToIssue ||
        typeof data.exactSharesToIssue !== 'string'
    ) {
        throw new Error(
            'Invalid serialized AddLiquidityBufferQueryOutput: missing or invalid "exactSharesToIssue"',
        );
    }

    if (!data.wrappedAmountIn) {
        throw new Error(
            'Invalid serialized AddLiquidityBufferQueryOutput: missing "wrappedAmountIn"',
        );
    }

    if (!data.underlyingAmountIn) {
        throw new Error(
            'Invalid serialized AddLiquidityBufferQueryOutput: missing "underlyingAmountIn"',
        );
    }

    if (typeof data.chainId !== 'number') {
        throw new Error(
            'Invalid serialized AddLiquidityBufferQueryOutput: missing or invalid "chainId"',
        );
    }

    if (data.protocolVersion !== 3) {
        throw new Error(
            'Invalid serialized AddLiquidityBufferQueryOutput: protocolVersion must be 3',
        );
    }

    if (!data.to || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBufferQueryOutput: missing or invalid "to"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized AddLiquidityBufferQueryOutput: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    return {
        exactSharesToIssue: BigInt(data.exactSharesToIssue),
        wrappedAmountIn: deserializeTokenAmount(data.wrappedAmountIn),
        underlyingAmountIn: deserializeTokenAmount(data.underlyingAmountIn),
        chainId: data.chainId,
        protocolVersion: 3,
        to: data.to as Address,
    };
}

/**
 * Serializes an AddLiquidityBufferBuildCallOutput to JSON-serializable format.
 * @param call - The AddLiquidityBufferBuildCallOutput to serialize
 * @returns Serialized call data
 */
export function serializeBufferCall(
    call: AddLiquidityBufferBuildCallOutput,
): unknown {
    return {
        to: call.to,
        callData: call.callData,
        value: call.value.toString(),
        exactSharesToIssue: call.exactSharesToIssue.toString(),
        maxWrappedAmountIn: serializeTokenAmount(call.maxWrappedAmountIn),
        maxUnderlyingAmountIn: serializeTokenAmount(call.maxUnderlyingAmountIn),
    };
}

/**
 * Deserializes an AddLiquidityBufferBuildCallOutput from JSON.
 * @param serialized - The serialized call data
 * @returns An AddLiquidityBufferBuildCallOutput instance
 * @throws Error if the data structure is invalid
 */
export function deserializeBufferCall(
    serialized: unknown,
): AddLiquidityBufferBuildCallOutput {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized AddLiquidityBufferBuildCallOutput: expected object, got ${typeof serialized}`,
        );
    }

    const data = serialized as {
        to?: string;
        callData?: string;
        value?: string;
        exactSharesToIssue?: string;
        maxWrappedAmountIn?: unknown;
        maxUnderlyingAmountIn?: unknown;
    };

    if (!data.to || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBufferBuildCallOutput: missing or invalid "to"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized AddLiquidityBufferBuildCallOutput: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    if (!data.callData || typeof data.callData !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBufferBuildCallOutput: missing or invalid "callData"',
        );
    }

    if (!data.value || typeof data.value !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBufferBuildCallOutput: missing or invalid "value"',
        );
    }

    let valueBigInt: bigint;
    try {
        valueBigInt = BigInt(data.value);
    } catch {
        throw new Error(
            `Invalid serialized AddLiquidityBufferBuildCallOutput: value "${data.value}" cannot be converted to BigInt`,
        );
    }

    if (valueBigInt < 0n) {
        throw new Error(
            `Invalid serialized AddLiquidityBufferBuildCallOutput: value cannot be negative, got ${data.value}`,
        );
    }

    if (
        !data.exactSharesToIssue ||
        typeof data.exactSharesToIssue !== 'string'
    ) {
        throw new Error(
            'Invalid serialized AddLiquidityBufferBuildCallOutput: missing or invalid "exactSharesToIssue"',
        );
    }

    if (!data.maxWrappedAmountIn) {
        throw new Error(
            'Invalid serialized AddLiquidityBufferBuildCallOutput: missing "maxWrappedAmountIn"',
        );
    }

    if (!data.maxUnderlyingAmountIn) {
        throw new Error(
            'Invalid serialized AddLiquidityBufferBuildCallOutput: missing "maxUnderlyingAmountIn"',
        );
    }

    return {
        to: data.to as Address,
        callData: data.callData as Hex,
        value: valueBigInt,
        exactSharesToIssue: BigInt(data.exactSharesToIssue),
        maxWrappedAmountIn: deserializeTokenAmount(data.maxWrappedAmountIn),
        maxUnderlyingAmountIn: deserializeTokenAmount(
            data.maxUnderlyingAmountIn,
        ),
    };
}

/**
 * Serializes an AddLiquidityBoostedQueryOutput to JSON-serializable format.
 * @param queryOutput - The AddLiquidityBoostedQueryOutput to serialize
 * @returns Serialized query output data
 */
export function serializeBoostedQueryOutput(
    queryOutput: AddLiquidityBoostedQueryOutput,
): unknown {
    return {
        poolId: queryOutput.poolId,
        poolType: queryOutput.poolType,
        addLiquidityKind: queryOutput.addLiquidityKind,
        wrapUnderlying: queryOutput.wrapUnderlying,
        bptOut: serializeTokenAmount(queryOutput.bptOut),
        amountsIn: queryOutput.amountsIn.map(serializeTokenAmount),
        chainId: queryOutput.chainId,
        protocolVersion: queryOutput.protocolVersion,
        userData: queryOutput.userData,
        to: queryOutput.to,
    };
}

/**
 * Deserializes an AddLiquidityBoostedQueryOutput from JSON.
 * @param serialized - The serialized query output data
 * @returns An AddLiquidityBoostedQueryOutput instance
 * @throws Error if the data structure is invalid
 */
export function deserializeBoostedQueryOutput(
    serialized: unknown,
): AddLiquidityBoostedQueryOutput {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized AddLiquidityBoostedQueryOutput: expected object, got ${typeof serialized}`,
        );
    }

    const data = serialized as {
        poolId?: string;
        poolType?: string;
        addLiquidityKind?: string;
        wrapUnderlying?: boolean[];
        bptOut?: unknown;
        amountsIn?: unknown[];
        chainId?: number;
        protocolVersion?: number;
        userData?: string;
        to?: string;
    };

    if (!data.poolId || typeof data.poolId !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: missing or invalid "poolId"',
        );
    }

    if (!data.poolType || typeof data.poolType !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: missing or invalid "poolType"',
        );
    }

    if (
        !data.addLiquidityKind ||
        !Object.values(AddLiquidityKind).includes(
            data.addLiquidityKind as AddLiquidityKind,
        )
    ) {
        throw new Error(
            `Invalid serialized AddLiquidityBoostedQueryOutput: invalid "addLiquidityKind", got ${data.addLiquidityKind}`,
        );
    }

    if (!Array.isArray(data.wrapUnderlying)) {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: "wrapUnderlying" must be an array',
        );
    }

    if (!data.bptOut) {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: missing "bptOut"',
        );
    }

    if (!Array.isArray(data.amountsIn)) {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: "amountsIn" must be an array',
        );
    }

    if (typeof data.chainId !== 'number') {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: missing or invalid "chainId"',
        );
    }

    if (data.protocolVersion !== 3) {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: protocolVersion must be 3',
        );
    }

    if (!data.userData || typeof data.userData !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: missing or invalid "userData"',
        );
    }

    if (!data.to || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityBoostedQueryOutput: missing or invalid "to"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized AddLiquidityBoostedQueryOutput: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    return {
        poolId: data.poolId as Hex,
        poolType: data.poolType,
        addLiquidityKind: data.addLiquidityKind as AddLiquidityKind,
        wrapUnderlying: data.wrapUnderlying,
        bptOut: deserializeTokenAmount(data.bptOut),
        amountsIn: data.amountsIn.map(deserializeTokenAmount),
        chainId: data.chainId,
        protocolVersion: 3,
        userData: data.userData as Hex,
        to: data.to as Address,
    };
}

/**
 * Serializes an AddLiquidityBuildCallOutput (boosted) to JSON-serializable format.
 * Boosted uses the same AddLiquidityBuildCallOutput type as regular tests.
 * @param call - The AddLiquidityBuildCallOutput to serialize
 * @returns Serialized call data
 */
export function serializeBoostedCall(
    call: AddLiquidityBuildCallOutput,
): unknown {
    return serializeCall(call);
}

/**
 * Deserializes an AddLiquidityBuildCallOutput (boosted) from JSON.
 * Boosted uses the same AddLiquidityBuildCallOutput type as regular tests.
 * @param serialized - The serialized call data
 * @returns An AddLiquidityBuildCallOutput instance
 * @throws Error if the data structure is invalid
 */
export function deserializeBoostedCall(
    serialized: unknown,
): AddLiquidityBuildCallOutput {
    return deserializeCall(serialized);
}

/**
 * Serializes an AddLiquidityNestedQueryOutputV3 to JSON-serializable format.
 * @param queryOutput - The AddLiquidityNestedQueryOutputV3 to serialize
 * @returns Serialized query output data
 */
export function serializeNestedQueryOutput(
    queryOutput: AddLiquidityNestedQueryOutputV3,
): unknown {
    return {
        to: queryOutput.to,
        amountsIn: queryOutput.amountsIn.map(serializeTokenAmount),
        bptOut: serializeTokenAmount(queryOutput.bptOut),
        protocolVersion: queryOutput.protocolVersion,
        parentPool: queryOutput.parentPool,
        userData: queryOutput.userData,
        chainId: queryOutput.chainId,
    };
}

/**
 * Deserializes an AddLiquidityNestedQueryOutputV3 from JSON.
 * @param serialized - The serialized query output data
 * @returns An AddLiquidityNestedQueryOutputV3 instance
 * @throws Error if the data structure is invalid
 */
export function deserializeNestedQueryOutput(
    serialized: unknown,
): AddLiquidityNestedQueryOutputV3 {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized AddLiquidityNestedQueryOutputV3: expected object, got ${typeof serialized}`,
        );
    }

    const data = serialized as {
        to?: string;
        amountsIn?: unknown[];
        bptOut?: unknown;
        protocolVersion?: number;
        parentPool?: string;
        userData?: string;
        chainId?: number;
    };

    if (!data.to || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedQueryOutputV3: missing or invalid "to"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized AddLiquidityNestedQueryOutputV3: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    if (!Array.isArray(data.amountsIn)) {
        throw new Error(
            'Invalid serialized AddLiquidityNestedQueryOutputV3: "amountsIn" must be an array',
        );
    }

    if (!data.bptOut) {
        throw new Error(
            'Invalid serialized AddLiquidityNestedQueryOutputV3: missing "bptOut"',
        );
    }

    if (data.protocolVersion !== 3) {
        throw new Error(
            'Invalid serialized AddLiquidityNestedQueryOutputV3: protocolVersion must be 3',
        );
    }

    if (!data.parentPool || typeof data.parentPool !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedQueryOutputV3: missing or invalid "parentPool"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.parentPool)) {
        throw new Error(
            `Invalid serialized AddLiquidityNestedQueryOutputV3: "parentPool" address "${data.parentPool}" is not a valid Ethereum address`,
        );
    }

    if (!data.userData || typeof data.userData !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedQueryOutputV3: missing or invalid "userData"',
        );
    }

    if (typeof data.chainId !== 'number') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedQueryOutputV3: missing or invalid "chainId"',
        );
    }

    return {
        to: data.to as Address,
        amountsIn: data.amountsIn.map(deserializeTokenAmount),
        bptOut: deserializeTokenAmount(data.bptOut),
        protocolVersion: 3,
        parentPool: data.parentPool as Address,
        userData: data.userData as Hex,
        chainId: data.chainId,
    };
}

/**
 * Serializes an AddLiquidityNestedBuildCallOutput to JSON-serializable format.
 * @param call - The AddLiquidityNestedBuildCallOutput to serialize
 * @returns Serialized call data
 */
export function serializeNestedCall(
    call: AddLiquidityNestedBuildCallOutput,
): unknown {
    return {
        to: call.to,
        callData: call.callData,
        value: call.value.toString(),
        minBptOut: call.minBptOut.toString(),
    };
}

/**
 * Deserializes an AddLiquidityNestedBuildCallOutput from JSON.
 * @param serialized - The serialized call data
 * @returns An AddLiquidityNestedBuildCallOutput instance
 * @throws Error if the data structure is invalid
 */
export function deserializeNestedCall(
    serialized: unknown,
): AddLiquidityNestedBuildCallOutput {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized AddLiquidityNestedBuildCallOutput: expected object, got ${typeof serialized}`,
        );
    }

    const data = serialized as {
        to?: string;
        callData?: string;
        value?: string;
        minBptOut?: string;
    };

    if (!data.to || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedBuildCallOutput: missing or invalid "to"',
        );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized AddLiquidityNestedBuildCallOutput: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    if (!data.callData || typeof data.callData !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedBuildCallOutput: missing or invalid "callData"',
        );
    }

    if (!data.value || typeof data.value !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedBuildCallOutput: missing or invalid "value"',
        );
    }

    let valueBigInt: bigint;
    try {
        valueBigInt = BigInt(data.value);
    } catch {
        throw new Error(
            `Invalid serialized AddLiquidityNestedBuildCallOutput: value "${data.value}" cannot be converted to BigInt`,
        );
    }

    if (valueBigInt < 0n) {
        throw new Error(
            `Invalid serialized AddLiquidityNestedBuildCallOutput: value cannot be negative, got ${data.value}`,
        );
    }

    if (!data.minBptOut || typeof data.minBptOut !== 'string') {
        throw new Error(
            'Invalid serialized AddLiquidityNestedBuildCallOutput: missing or invalid "minBptOut"',
        );
    }

    let minBptOutBigInt: bigint;
    try {
        minBptOutBigInt = BigInt(data.minBptOut);
    } catch {
        throw new Error(
            `Invalid serialized AddLiquidityNestedBuildCallOutput: minBptOut "${data.minBptOut}" cannot be converted to BigInt`,
        );
    }

    if (minBptOutBigInt < 0n) {
        throw new Error(
            `Invalid serialized AddLiquidityNestedBuildCallOutput: minBptOut cannot be negative, got ${data.minBptOut}`,
        );
    }

    return {
        to: data.to as Address,
        callData: data.callData as Hex,
        value: valueBigInt,
        minBptOut: minBptOutBigInt,
    };
}

// Re-export Permit2 serialization functions for convenience
export { serializePermit2, deserializePermit2 };
