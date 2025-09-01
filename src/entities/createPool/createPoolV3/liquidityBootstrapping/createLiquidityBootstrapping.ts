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
        const args = [
            input.name || input.symbol, // name can be optional
            input.symbol,
            {
                ...input.lbpParams,
                startTime: input.lbpParams.startTimestamp,
                endTime: input.lbpParams.endTimestamp,
            },
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
            input.poolCreator ? input.poolCreator : zeroAddress,
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
        const args = [
            input.name || input.symbol, // name can be optional
            input.symbol,
            {
                ...input.lbpParams,
                startTime: input.lbpParams.startTimestamp,
                endTime: input.lbpParams.endTimestamp,
            },
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
            input.poolCreator ? input.poolCreator : zeroAddress,
            input.lbpMigrationParams.bptLockDurationinSeconds,
            input.lbpMigrationParams.bptPercentageToMigrate,
            input.lbpMigrationParams.migrationWeightProjectToken,
            input.lbpMigrationParams.migrationWeightReserveToken,
        ] as const;
        return encodeFunctionData({
            abi: lBPoolFactoryAbi_V3Extended,
            functionName: 'createWithMigration',
            args,
        });
    }
}
