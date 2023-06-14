declare global {
    namespace jest {
        interface Matchers<R> {
            toBeCloseToDelta(value: bigint, delta: bigint): R;
        }
    }
}

export {};
