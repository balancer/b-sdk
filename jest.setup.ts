declare global {
    namespace jest {
        interface Matchers<R, T> {
            toBeCloseToDelta(value: bigint, delta: bigint): R;
        }
    }
}

expect.extend({
    toBeCloseToDelta(received, expected, delta): jest.CustomMatcherResult {
        const pass = Math.abs(Number(received - expected)) <= Number(delta);
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be within ${delta} of ${expected}`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${received} to be within ${delta} of ${expected}`,
                pass: false,
            };
        }
    },
});

export {};
