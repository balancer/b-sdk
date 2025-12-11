import { Address } from 'viem';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { TokenAmount } from '@/entities/tokenAmount';
import { Token } from '@/entities/token';
import {
    SwapKind,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
} from '@/index';

// JSON serialization utility
export const serializeTokenAmount = (tokenAmount: TokenAmount) => {
    return {
        token: {
            chainId: tokenAmount.token.chainId,
            address: tokenAmount.token.address,
            decimals: tokenAmount.token.decimals,
            ...(tokenAmount.token.symbol !== undefined && {
                symbol: tokenAmount.token.symbol,
            }),
            ...(tokenAmount.token.name !== undefined && {
                name: tokenAmount.token.name,
            }),
            wrapped: tokenAmount.token.wrapped,
        },
        amount: tokenAmount.amount.toString(),
        scalar: tokenAmount.scalar.toString(),
        decimalScale: tokenAmount.decimalScale.toString(),
        scale18: tokenAmount.scale18.toString(),
    };
};

/**
 * Deserializes a TokenAmount from JSON.
 * Validates the structure and data before creating the TokenAmount instance.
 * @param serialized - The serialized TokenAmount data
 * @returns A TokenAmount instance
 * @throws Error if the data structure is invalid or validation fails
 */
export const deserializeTokenAmount = (serialized: unknown): TokenAmount => {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized TokenAmount: expected object, got ${typeof serialized}`,
        );
    }

    if (!('token' in serialized)) {
        throw new Error(
            'Invalid serialized TokenAmount: missing required field "token"',
        );
    }
    if (!('amount' in serialized)) {
        throw new Error(
            'Invalid serialized TokenAmount: missing required field "amount"',
        );
    }

    const data = serialized as {
        token: {
            chainId: number;
            address: Address;
            decimals: number;
            symbol?: string;
            name?: string;
            wrapped: Address;
        };
        amount: string;
        scalar?: string;
        decimalScale?: string;
        scale18?: string;
    };

    // Validate token structure
    if (
        typeof data.token !== 'object' ||
        data.token === null ||
        typeof data.token.chainId !== 'number' ||
        typeof data.token.address !== 'string' ||
        typeof data.token.decimals !== 'number' ||
        typeof data.token.wrapped !== 'string'
    ) {
        throw new Error(
            'Invalid serialized TokenAmount: token object is malformed or missing required fields (chainId, address, decimals, wrapped)',
        );
    }

    // Validate amount
    if (typeof data.amount !== 'string') {
        throw new Error(
            `Invalid serialized TokenAmount: amount must be a string, got ${typeof data.amount}`,
        );
    }

    let amountBigInt: bigint;
    try {
        amountBigInt = BigInt(data.amount);
    } catch {
        throw new Error(
            `Invalid serialized TokenAmount: amount "${data.amount}" cannot be converted to BigInt`,
        );
    }

    // Validate amount is non-negative
    if (amountBigInt < 0n) {
        throw new Error(
            `Invalid serialized TokenAmount: amount cannot be negative, got ${data.amount}`,
        );
    }

    // Validate address format (basic check - should be hex string starting with 0x)
    if (!/^0x[a-fA-F0-9]{40}$/.test(data.token.address)) {
        throw new Error(
            `Invalid serialized TokenAmount: token address "${data.token.address}" is not a valid Ethereum address`,
        );
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(data.token.wrapped)) {
        throw new Error(
            `Invalid serialized TokenAmount: wrapped address "${data.token.wrapped}" is not a valid Ethereum address`,
        );
    }

    // Validate decimals
    if (data.token.decimals < 0 || data.token.decimals > 255) {
        throw new Error(
            `Invalid serialized TokenAmount: decimals must be between 0 and 255, got ${data.token.decimals}`,
        );
    }

    const token = new Token(
        data.token.chainId,
        data.token.address,
        data.token.decimals,
        data.token.symbol,
        data.token.name,
        data.token.wrapped,
    );
    return TokenAmount.fromRawAmount(token, amountBigInt);
};

/**
 * Deserializes a QueryOutput (ExactIn or ExactOut) from JSON.
 * Validates the structure and required fields based on swap kind.
 * @param serialized - The serialized QueryOutput data
 * @returns An ExactInQueryOutput or ExactOutQueryOutput
 * @throws Error if the data structure is invalid or required fields are missing
 */
export const deserializeQueryOutput = (
    serialized: unknown,
): ExactInQueryOutput | ExactOutQueryOutput => {
    if (typeof serialized !== 'object' || serialized === null) {
        throw new Error(
            `Invalid serialized QueryOutput: expected object, got ${typeof serialized}`,
        );
    }

    if (!('swapKind' in serialized)) {
        throw new Error(
            'Invalid serialized QueryOutput: missing required field "swapKind"',
        );
    }

    const data = serialized as {
        swapKind: number;
        to?: Address;
        pathAmounts?: string[];
        amountIn?: unknown;
        expectedAmountOut?: unknown;
        amountOut?: unknown;
        expectedAmountIn?: unknown;
    };

    // Validate swapKind
    if (
        data.swapKind !== SwapKind.GivenIn &&
        data.swapKind !== SwapKind.GivenOut
    ) {
        throw new Error(
            `Invalid serialized QueryOutput: swapKind must be ${SwapKind.GivenIn} (GivenIn) or ${SwapKind.GivenOut} (GivenOut), got ${data.swapKind}`,
        );
    }

    // Validate 'to' field
    if (!('to' in data) || typeof data.to !== 'string') {
        throw new Error(
            'Invalid serialized QueryOutput: missing or invalid "to" field (must be a valid address string)',
        );
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(data.to)) {
        throw new Error(
            `Invalid serialized QueryOutput: "to" address "${data.to}" is not a valid Ethereum address`,
        );
    }

    // Validate pathAmounts if present
    let pathAmounts: bigint[] | undefined;
    if (data.pathAmounts !== undefined) {
        if (!Array.isArray(data.pathAmounts)) {
            throw new Error(
                `Invalid serialized QueryOutput: pathAmounts must be an array, got ${typeof data.pathAmounts}`,
            );
        }
        try {
            pathAmounts = data.pathAmounts.map((amt) => {
                if (typeof amt !== 'string') {
                    throw new Error(
                        `Invalid serialized QueryOutput: pathAmounts must contain string values, got ${typeof amt}`,
                    );
                }
                const bigIntAmt = BigInt(amt);
                if (bigIntAmt < 0n) {
                    throw new Error(
                        `Invalid serialized QueryOutput: pathAmounts cannot contain negative values, got ${amt}`,
                    );
                }
                return bigIntAmt;
            });
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(
                `Invalid serialized QueryOutput: pathAmounts contains invalid values: ${error}`,
            );
        }
    }

    const base = {
        swapKind: data.swapKind as SwapKind,
        to: data.to,
        pathAmounts,
    };

    if (data.swapKind === SwapKind.GivenIn) {
        if (!('amountIn' in data) || data.amountIn === undefined) {
            throw new Error(
                'Invalid ExactInQueryOutput: missing required field "amountIn"',
            );
        }
        if (
            !('expectedAmountOut' in data) ||
            data.expectedAmountOut === undefined
        ) {
            throw new Error(
                'Invalid ExactInQueryOutput: missing required field "expectedAmountOut"',
            );
        }
        return {
            ...base,
            swapKind: SwapKind.GivenIn,
            amountIn: deserializeTokenAmount(data.amountIn),
            expectedAmountOut: deserializeTokenAmount(data.expectedAmountOut),
        } as ExactInQueryOutput;
    }

    // GivenOut case
    if (!('amountOut' in data) || data.amountOut === undefined) {
        throw new Error(
            'Invalid ExactOutQueryOutput: missing required field "amountOut"',
        );
    }
    if (!('expectedAmountIn' in data) || data.expectedAmountIn === undefined) {
        throw new Error(
            'Invalid ExactOutQueryOutput: missing required field "expectedAmountIn"',
        );
    }
    return {
        ...base,
        swapKind: SwapKind.GivenOut,
        amountOut: deserializeTokenAmount(data.amountOut),
        expectedAmountIn: deserializeTokenAmount(data.expectedAmountIn),
    } as ExactOutQueryOutput;
};

export function serializeQueryOutput(
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput,
): unknown {
    const base = {
        swapKind: queryOutput.swapKind,
        to: queryOutput.to,
        pathAmounts: queryOutput.pathAmounts?.map((amt) => amt.toString()),
    };

    if (queryOutput.swapKind === SwapKind.GivenIn) {
        return {
            ...base,
            amountIn: serializeTokenAmount(queryOutput.amountIn),
            expectedAmountOut: serializeTokenAmount(
                queryOutput.expectedAmountOut,
            ),
        };
    }
    return {
        ...base,
        amountOut: serializeTokenAmount(queryOutput.amountOut),
        expectedAmountIn: serializeTokenAmount(queryOutput.expectedAmountIn),
    };
}

export function serializeCallData(
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut,
): unknown {
    const base = {
        to: call.to,
        callData: call.callData,
        value: call.value.toString(),
    };

    if ('minAmountOut' in call) {
        return {
            ...base,
            minAmountOut: serializeTokenAmount(call.minAmountOut),
        };
    }
    return {
        ...base,
        maxAmountIn: serializeTokenAmount(call.maxAmountIn),
    };
}

/**
 * Loads swap test data from a JSON file.
 * Returns an empty object if the file doesn't exist or can't be read.
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data as a record, or empty object on error
 */
export function loadSwapTestData(filePath: string): Record<string, unknown> {
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
 * Saves swap test data to a JSON file.
 * Deep merges existingData with newData (existingData takes precedence for conflicts).
 * Logs errors but doesn't throw.
 * @param filePath - Path to the JSON file
 * @param existingData - Existing test data to preserve
 * @param newData - New test data to add (nested structure)
 */
export async function saveSwapTestData(
    filePath: string,
    existingData: Record<string, unknown>,
    newData: Record<string, unknown>,
): Promise<void> {
    try {
        // Deep merge saved data with new test data (preserves existing, adds new)
        const mergedData = deepMerge(existingData, newData);

        // Write the merged data to file
        await writeFile(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');
        console.log(`Swap test data written to ${filePath}`);
    } catch (error) {
        console.error('Failed to write swap test data:', error);
        // Don't throw - we don't want to fail tests if file write fails
    }
}

/**
 * Type representing saved swap test data with serialized query output and call data.
 */
export type SavedSwapTestData = {
    queryOutput: unknown;
    call: unknown;
};

/**
 * Type guard to check if data is valid saved swap test data.
 * Valid saved data must be an object with both 'queryOutput' and 'call' properties.
 * @param data - Data to check
 * @returns True if data is valid SavedSwapTestData, false otherwise
 */
export function hasSavedTestData(data: unknown): data is SavedSwapTestData {
    return (
        data !== undefined &&
        data !== null &&
        typeof data === 'object' &&
        'queryOutput' in data &&
        'call' in data
    );
}

/**
 * Type for test configuration used to check saved data.
 */
type TestConfig = {
    name: string;
    isNative: 'input' | 'output' | 'none';
};

/**
 * Checks if all tests for a given test configuration have valid saved data.
 * Valid saved data must be an object with both 'queryOutput' and 'call' properties.
 * Checks the nested structure: testName > context > subContext > swapKind
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

    // Check native input tests (if applicable)
    if (test.isNative === 'input') {
        const nativeInput = testDataObj['native input'];
        if (
            !nativeInput ||
            typeof nativeInput !== 'object' ||
            !hasSavedTestData(
                (nativeInput as Record<string, unknown>).GivenIn,
            ) ||
            !hasSavedTestData((nativeInput as Record<string, unknown>).GivenOut)
        ) {
            return false;
        }
    }

    // Check permit2 direct approval tests
    const permit2 = testDataObj['permit2 direct approval'];
    if (!permit2 || typeof permit2 !== 'object') {
        return false;
    }
    const permit2Obj = permit2 as Record<string, unknown>;

    // Check native output tests (if applicable)
    if (test.isNative === 'output') {
        const nativeOutput = permit2Obj['native output'];
        if (
            !nativeOutput ||
            typeof nativeOutput !== 'object' ||
            !hasSavedTestData(
                (nativeOutput as Record<string, unknown>).GivenIn,
            ) ||
            !hasSavedTestData(
                (nativeOutput as Record<string, unknown>).GivenOut,
            )
        ) {
            return false;
        }
    }

    // Check token output tests (always present)
    const tokenOutput = permit2Obj['token output'];
    if (
        !tokenOutput ||
        typeof tokenOutput !== 'object' ||
        !hasSavedTestData((tokenOutput as Record<string, unknown>).GivenIn) ||
        !hasSavedTestData((tokenOutput as Record<string, unknown>).GivenOut)
    ) {
        return false;
    }

    return true;
}
