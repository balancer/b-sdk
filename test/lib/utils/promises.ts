export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 * @param fn - The async function to retry
 * @param options - Retry options
 * @returns The result of the function
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        backoffMultiplier?: number;
        shouldRetry?: (error: unknown) => boolean;
    } = {},
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelayMs = 1000,
        maxDelayMs = 10000,
        backoffMultiplier = 2,
        shouldRetry = (error: unknown) => {
            // Retry on HTTP 429 errors and network-related errors
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            return (
                errorMessage.includes('429') ||
                errorMessage.includes('Max retries exceeded') ||
                errorMessage.includes('failed to get account') ||
                errorMessage.includes('failed to fetch') ||
                errorMessage.includes('state') ||
                errorMessage.includes('not available')
            );
        },
    } = options;

    let lastError: unknown;
    let delay = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry this error
            if (!shouldRetry(error)) {
                throw error;
            }

            // Don't retry on the last attempt
            if (attempt === maxAttempts) {
                break;
            }

            const errorMsg =
                error instanceof Error ? error.message : String(error);
            // Use stderr for CI visibility (matches vitest's stderr output)
            console.warn(
                `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`,
                errorMsg,
            );

            await sleep(delay);
            delay = Math.min(delay * backoffMultiplier, maxDelayMs);
        }
    }

    throw lastError;
}
