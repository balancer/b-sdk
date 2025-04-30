export type Address = `0x${string}`;
export type Hex = `0x${string}`;
export type BigintIsh = bigint | string | number;

export enum PoolType {
    AaveLinear = 'AaveLinear',
    ComposableStable = 'ComposableStable',
    CowAmm = 'CowAmm',
    Fx = 'FX',
    Gyro2 = 'Gyro2',
    Gyro3 = 'Gyro3',
    GyroE = 'GyroE',
    MetaStable = 'MetaStable',
    Stable = 'Stable',
    StableSurge = 'StableSurge',
    Weighted = 'Weighted',
    Boosted = 'Boosted',
    ReClamm = 'ReClamm',
}

export enum SwapKind {
    GivenIn = 0,
    GivenOut = 1,
}

export interface SingleSwap {
    poolId: Hex;
    kind: SwapKind;
    assetIn: Address;
    assetOut: Address;
    amount: bigint;
    userData: Hex;
}

export interface BatchSwapStep {
    poolId: Hex;
    assetInIndex: bigint;
    assetOutIndex: bigint;
    amount: bigint;
    userData: Hex;
}

export type InputToken = {
    address: Address;
    decimals: number;
};

export type InputAmount = InputToken & {
    rawAmount: bigint;
};

export enum TokenType {
    STANDARD = 0,
    TOKEN_WITH_RATE = 1,
    ERC4626_TOKEN = 2,
}
