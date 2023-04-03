import { default as retry } from 'async-retry';

export async function fetchWithRetry<T>(
    fetch: () => Promise<T>,
    config = { retries: 1 },
): Promise<T | null> {
    let response: T | null = null;
    await retry(
        async () => {
            response = await fetch();
            return response;
        },
        {
            retries: config.retries,
        },
    );

    return response;
}
