import { Address, Hex } from 'viem';
import { MigratePool } from './index';
import { PoolState } from '../types';
import { Permit2 } from '../permit2Helper';

export type MigratePoolInput = MigratePoolLiquidityBootstrappingInput;

export type MigratePoolLiquidityBootstrappingInput = {
    poolType: string;
    pool: Address;
    chainid: number;
    rpcUrl: string;
    excessReceiver: Address;
    weightedPoolParams: WeightedPoolParams;
};

export interface MigratePoolBase {
    query(
        input: MigratePoolInput,
        block?: bigint,
    ): Promise<MigratePoolBaseQueryOutput>;
    buildCall(input: MigratePoolBuildCallInput): MigratePoolBuildCallOutput;
    buildCallWithPermit2(
        input: MigratePoolBuildCallInput,
        permit2: Permit2,
    ): MigratePoolBuildCallOutput;
}

export type MigratePoolConfig = {
    customMigratePoolTypes: Record<string, MigratePoolBase>;
};

export type MigratePoolQueryInput = MigratePoolLiquidityBootstrappingQueryInput;

export type MigratePoolLiquidityBootstrappingQueryInput =
    MigratePoolLiquidityBootstrappingInput & {
        sender: Address;
    };

export type MigratePoolQueryOutput =
    | MigratePoolLiquidityBootstrappingQueryOutput
    | MigratePoolBaseQueryOutput;

// function is not payable, so no value is needed
export type MigratePoolBuildCallOutput =
    MigratePoolLiquidityBootstrappingBuildCallOutput;

export type WeightedPoolParams = {
    name?: string;
    symbol: string;
    pauseManager: Address;
    swapFeeManager: Address;
    poolCreator?: Address;
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
        exactAmountsIn: readonly bigint[];
    };

export type MigratePoolLiquidityBootstrappingBuildCallInput =
    MigratePoolLiquidityBootstrappingQueryOutput &
        MigratePoolLiquidityBootstrappingInput;

export type MigratePoolBuildCallInput =
    | MigratePoolLiquidityBootstrappingBuildCallInput
    | MigratePoolBaseBuildCallInput;

export type MigratePoolBaseBuildCallInput =
    | MigratePoolInput
    | (MigratePoolBaseQueryOutput & {
          bptAmountOut: bigint;
          exactAmountsIn: bigint[];
      });
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

/* export type MigratePoolLiquidityBootstrappingInput = MigratePoolBaseInput & {
    excessReceiver: Address;
    weightedPoolParams: WeightedPoolParams;
}; */

export type MigratePoolLIquidityBootstrappingQueryInput =
    MigratePoolLiquidityBootstrappingInput & {
        sender: Address;
    };
