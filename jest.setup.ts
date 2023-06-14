expect.extend({
    toBeCloseToDelta(received, expected, delta) {
        if (
            typeof received !== 'bigint' ||
            typeof expected !== 'bigint' ||
            typeof delta !== 'bigint'
        ) {
            throw new Error('toBeCloseToDelta expects BigInts');
        }

        const receivedDelta =
            received > expected ? received - expected : expected - received;

        return {
            message: () =>
                `Expected ${expected} \nReceived ${received} \nExpected delta ${delta} \nReceived delta ${receivedDelta} \n`,
            pass: receivedDelta <= delta,
        };
    },
});
