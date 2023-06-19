export const expectToBeCloseToDelta = (
    received: bigint,
    expected: bigint,
    delta: number,
) => {
    let diff = expected - received;
    if (diff < 0) diff = diff * -1n;
    expect(diff).toBeLessThanOrEqual(delta);
};
