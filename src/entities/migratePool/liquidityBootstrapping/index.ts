import { createPublicClient, encodeFunctionData, Hex, http } from 'viem';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { CHAINS } from '@/utils';
import {
    MigratePoolBase,
    MigratePoolInput,
    MigratePoolBuildCallOutput,
    MigratePoolQueryOutput,
} from '../types';

export class MigratePoolLiquidityBootstrapping implements MigratePoolBase {
    public async query(
        input: MigratePoolInput,
        block?: bigint,
    ): Promise<MigratePoolQueryOutput> {
        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainid],
        });

        const { result: bptAmountOut } = await client.simulateContract({
            address: AddressProvider.LBPoolMigrationRouter(input.chainid),
            abi: balancerV3Contracts.lBPoolMigrationRouterAbi,
            functionName: 'queryMigrateLiquidity',
            args: [],
            blockNumber: block,
        });

        return {
            bptAmountOut: bptAmountOut,
            poolType: 'LiquidityBootstrapping',
            pool: input.pool,
            chainId: input.chainid,
            to: AddressProvider.LBPoolMigrationRouter(input.chainid),
        };
    }

    public buildCall(input: MigratePoolInput): MigratePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: AddressProvider.LBPoolMigrationRouter(input.chainid),
        };
    }

    private encodeCall(input: MigratePoolInput): Hex {
        const args = [
            input.pool,
            input.excessReceiver,
            input.weightedPoolParams,
        ] as const;
        return encodeFunctionData({
            abi: balancerV3Contracts.lBPoolMigrationRouterAbi,
            functionName: 'migrateLiquidity',
            args,
        });
    }
}
