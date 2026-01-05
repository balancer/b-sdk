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
    // In CI, use longer delays for rate limiting
    const isCI =
        process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const {
        maxAttempts = 3,
        initialDelayMs = isCI ? 2000 : 1000,
        maxDelayMs = isCI ? 20000 : 10000,
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
            // #region agent log
            fetch(
                'http://127.0.0.1:7242/ingest/7f662b26-1a32-4a2e-98ea-db0b93d9db39',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        location: 'promises.ts:60',
                        message: 'retry backoff',
                        data: {
                            attempt,
                            maxAttempts,
                            delay,
                            errorType: errorMsg.includes('429')
                                ? '429'
                                : errorMsg.includes('state')
                                  ? 'state'
                                  : 'other',
                        },
                        timestamp: Date.now(),
                        sessionId: 'debug-session',
                        runId: 'run1',
                        hypothesisId: 'C',
                    }),
                },
            ).catch(() => {});
            // #endregion
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
