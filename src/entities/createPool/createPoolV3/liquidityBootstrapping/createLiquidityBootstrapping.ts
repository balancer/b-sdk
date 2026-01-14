import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolLiquidityBootstrappingInput,
    CreatePoolLiquidityBootstrappingWithMigrationInput,
} from '../../types';

import { lBPoolFactoryAbi_V3Extended } from '@/abi';

import { Hex } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export class CreatePoolLiquidityBootstrapping implements CreatePoolBase {
    public buildCall(
        input:
            | CreatePoolLiquidityBootstrappingInput
            | CreatePoolLiquidityBootstrappingWithMigrationInput,
    ): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: AddressProvider.LBPoolFactory(input.chainId),
        };
    }

    private encodeCall(
        input:
            | CreatePoolLiquidityBootstrappingInput
            | CreatePoolLiquidityBootstrappingWithMigrationInput,
    ): Hex {
        if ('lbpMigrationParams' in input && input.lbpMigrationParams) {
            return this.encodeCallWithMigration(
                input as CreatePoolLiquidityBootstrappingWithMigrationInput,
            );
        }
        return this.encodeCallWithoutMigration(
            input as CreatePoolLiquidityBootstrappingInput,
        );
    }

    private encodeCallWithoutMigration(
        input: CreatePoolLiquidityBootstrappingInput,
    ): Hex {
        const {
            owner,
            projectToken,
            reserveToken,
            startTimestamp,
            endTimestamp,
            blockProjectTokenSwapsIn,
            projectTokenStartWeight,
            reserveTokenStartWeight,
            projectTokenEndWeight,
            reserveTokenEndWeight,
            reserveTokenVirtualBalance,
        } = input.lbpParams;
        const args = [
            {
                // LBPCommonParams
                name: input.name || input.symbol,
                symbol: input.symbol,
                owner,
                projectToken,
                reserveToken,
                startTime: startTimestamp,
                endTime: endTimestamp,
                blockProjectTokenSwapsIn,
            },
            {
                // LBPParams (weights)
                projectTokenStartWeight,
                reserveTokenStartWeight,
                projectTokenEndWeight,
                reserveTokenEndWeight,
                reserveTokenVirtualBalance: reserveTokenVirtualBalance ?? 0n,
            },
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
            input.poolCreator ?? zeroAddress,
        ] as const;
        return encodeFunctionData({
            abi: lBPoolFactoryAbi_V3Extended,
            functionName: 'create',
            args,
        });
    }

    private encodeCallWithMigration(
        input: CreatePoolLiquidityBootstrappingWithMigrationInput,
    ): Hex {
        const {
            owner,
            projectToken,
            reserveToken,
            startTimestamp,
            endTimestamp,
            blockProjectTokenSwapsIn,
            projectTokenStartWeight,
            reserveTokenStartWeight,
            projectTokenEndWeight,
            reserveTokenEndWeight,
            reserveTokenVirtualBalance,
        } = input.lbpParams;
        const {
            lockDurationAfterMigration,
            bptPercentageToMigrate,
            migrationWeightProjectToken,
            migrationWeightReserveToken,
        } = input.lbpMigrationParams;
        const args = [
            {
                // LBPCommonParams
                name: input.name || input.symbol,
                symbol: input.symbol,
                owner,
                projectToken,
                reserveToken,
                startTime: startTimestamp,
                endTime: endTimestamp,
                blockProjectTokenSwapsIn,
            },
            {
                // MigrationParams (auto-resolve migrationRouter from chain)
                migrationRouter: AddressProvider.LBPoolMigrationRouter(
                    input.chainId,
                ),
                lockDurationAfterMigration,
                bptPercentageToMigrate,
                migrationWeightProjectToken,
                migrationWeightReserveToken,
            },
            {
                // LBPParams (weights)
                projectTokenStartWeight,
                reserveTokenStartWeight,
                projectTokenEndWeight,
                reserveTokenEndWeight,
                reserveTokenVirtualBalance: reserveTokenVirtualBalance ?? 0n,
            },
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
            input.poolCreator ?? zeroAddress,
        ] as const;
        return encodeFunctionData({
            abi: lBPoolFactoryAbi_V3Extended,
            functionName: 'createWithMigration',
            args,
        });
    }
}
