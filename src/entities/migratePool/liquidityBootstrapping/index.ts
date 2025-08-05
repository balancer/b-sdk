import {
    createPublicClient,
    encodeFunctionData,
    Hex,
    http,
    zeroAddress,
} from 'viem';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { CHAINS } from '@/utils';
import {
    MigratePoolBase,
    MigratePoolBuildCallOutput,
    MigratePoolLiquidityBootstrappingInput,
    MigratePoolLiquidityBootstrappingQueryInput,
    MigratePoolLiquidityBootstrappingQueryOutput,
} from '../types';
import { balancerMigrationRouterAbiExtended } from '@/abi';
import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';

export class MigratePoolLiquidityBootstrapping implements MigratePoolBase {
    public async query(
        input: MigratePoolLiquidityBootstrappingQueryInput,
        block?: bigint,
    ): Promise<MigratePoolLiquidityBootstrappingQueryOutput> {
        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainid],
        });

        const args = [
            input.pool,
            input.sender,
            input.excessReceiver,
            {
                name:
                    input.weightedPoolParams.name ||
                    input.weightedPoolParams.symbol,
                symbol: input.weightedPoolParams.symbol,
                roleAccounts: {
                    pauseManager: input.weightedPoolParams.pauseManager,
                    swapFeeManager: input.weightedPoolParams.swapFeeManager,
                    poolCreator:
                        input.weightedPoolParams.poolCreator ?? zeroAddress,
                },
                swapFeePercentage: input.weightedPoolParams.swapFeePercentage,
                poolHooksContract: input.weightedPoolParams.poolHooksContract,
                enableDonation: input.weightedPoolParams.enableDonation,
                disableUnbalancedLiquidity:
                    input.weightedPoolParams.disableUnbalancedLiquidity,
                salt: input.weightedPoolParams.salt || getRandomBytes32(),
            },
        ] as const;

        const { result } = await client.simulateContract({
            address: AddressProvider.LBPoolMigrationRouter(input.chainid),
            abi: balancerMigrationRouterAbiExtended,
            functionName: 'queryMigrateLiquidity',
            args,
            blockNumber: block,
        });
        const [exactAmountsIn, bptAmountOut] = result;

        return {
            bptAmountOut: bptAmountOut,
            exactAmountsIn: exactAmountsIn,
            poolType: 'LiquidityBootstrapping',
            pool: input.pool,
            chainId: input.chainid,
            to: AddressProvider.LBPoolMigrationRouter(input.chainid),
        };
    }

    public buildCall(
        input: MigratePoolLiquidityBootstrappingInput,
    ): MigratePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: AddressProvider.LBPoolMigrationRouter(input.chainid),
        };
    }

    private encodeCall(input: MigratePoolLiquidityBootstrappingInput): Hex {
        const args = [
            input.pool,
            input.excessReceiver,
            {
                name:
                    input.weightedPoolParams.name ||
                    input.weightedPoolParams.symbol,
                symbol: input.weightedPoolParams.symbol,
                roleAccounts: {
                    pauseManager: input.weightedPoolParams.pauseManager,
                    swapFeeManager: input.weightedPoolParams.swapFeeManager,
                    poolCreator:
                        input.weightedPoolParams.poolCreator ?? zeroAddress,
                },
                swapFeePercentage: input.weightedPoolParams.swapFeePercentage,
                poolHooksContract: input.weightedPoolParams.poolHooksContract,
                enableDonation: input.weightedPoolParams.enableDonation,
                disableUnbalancedLiquidity:
                    input.weightedPoolParams.disableUnbalancedLiquidity,
                salt: input.weightedPoolParams.salt || getRandomBytes32(),
            },
        ] as const;
        return encodeFunctionData({
            abi: balancerMigrationRouterAbiExtended,
            functionName: 'migrateLiquidity',
            args,
        });
    }
}
