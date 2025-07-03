import { Address, Hex } from 'viem';

export interface MigratePoolBase {
    query(
        input: MigratePoolInput,
        block?: bigint,
    ): Promise<MigratePoolQueryOutput>;
    buildCall(input: MigratePoolInput): MigratePoolBuildCallOutput;
}

export type MigratePoolInput = {
    poolType: string;
    pool: Address;
    chainid: number;
    rpcUrl: string;
    excessReceiver: Address;
    weightedPoolParams: WeightedPoolParams;
};

export type MigratePoolQueryOutput = {
    poolType: string;
    pool: Address;
    chainId: number;
    to: Address;
    bptAmountOut: bigint;
};

export type MigratePoolBuildCallOutput = {
    callData: Hex;
    to: Address;
};

type WeightedPoolParams = {
    name?: string;
    symbol: string;
    pauseManager: Address;
    swapFeeManager: Address;
    swapFeePercentage: bigint;
    poolHooksContract: Address;
    enableDonation: boolean;
    disableUnbalancedLiquidity: boolean;
    salt?: Hex;
};

export type MigratePoolBaseQueryOutput = {
    poolType: string;
    pool: Address;
    chainId: number;
    to: Address;
};

export type MigratePoolLiquidityBootstrappingQueryOutput =
    MigratePoolBaseQueryOutput & {
        bptAmountOut: bigint;
    };

export type MigratePoolLiquidityBootstrappingBuildCallInput =
    MigratePoolLiquidityBootstrappingQueryOutput &
        MigratePoolLiquidityBootstrappingInput;

// usually buildCalOutput functions had a value parameter as the functions are payable. However the LBPMigration Router
// does not have a payable `migrateLiquidity` function.
export type MigratePoolLiquidityBootstrappingBuildCallOutput = {
    callData: Hex;
    to: Address;
};

export type MigratePoolBaseInput = {
    pool: Address;
    chainid: number;
    rpcUrl: string;
};

export type MigratePoolLiquidityBootstrappingInput = MigratePoolBaseInput & {
    excessReceiver: Address;
    weightedPoolParams: WeightedPoolParams;
};

export type MigratePoolLIquidityBootstrappingQueryInput =
    MigratePoolLiquidityBootstrappingInput & {
        sender: Address;
    };
