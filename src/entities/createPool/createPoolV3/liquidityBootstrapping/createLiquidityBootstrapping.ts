import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolLiquidityBootstrappingInput,
    CreatePoolLiquidityBootstrappingWithMigrationInput,
    CreatePoolLiquidityBootstrappingFixedPriceInput,
} from '../../types';

import { lBPoolFactoryAbi_V3Extended, fixedPriceLBPoolFactoryAbi_V3 } from '@/abi';

import { Hex, PoolType } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export class CreatePoolLiquidityBootstrapping implements CreatePoolBase {
    public buildCall(
        input:
            | CreatePoolLiquidityBootstrappingInput
            | CreatePoolLiquidityBootstrappingWithMigrationInput
            | CreatePoolLiquidityBootstrappingFixedPriceInput,
    ): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        const to = input.poolType === PoolType.LiquidityBootstrappingFixedPrice
            ? AddressProvider.FixedPriceLBPoolFactory(input.chainId)
            : AddressProvider.LBPoolFactory(input.chainId);
        return {
            callData,
            to,
        };
    }

    private encodeCall(
        input:
            | CreatePoolLiquidityBootstrappingInput
            | CreatePoolLiquidityBootstrappingWithMigrationInput
            | CreatePoolLiquidityBootstrappingFixedPriceInput,
    ): Hex {
        if (input.poolType === PoolType.LiquidityBootstrappingFixedPrice) {
            return this.encodeCallFixedPrice(
                input as CreatePoolLiquidityBootstrappingFixedPriceInput,
            );
        }
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

    private encodeCallFixedPrice(
        input: CreatePoolLiquidityBootstrappingFixedPriceInput,
    ): Hex {
        const {
            owner,
            projectToken,
            reserveToken,
            startTimestamp,
            endTimestamp,
            projectTokenRate,
        } = input.fixedPriceLbpParams;

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
                blockProjectTokenSwapsIn: true, // Fixed price LBPs are always buy-only
            },
            projectTokenRate,
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
            input.poolCreator ?? zeroAddress,
        ] as const;

        return encodeFunctionData({
            abi: fixedPriceLBPoolFactoryAbi_V3,
            functionName: 'create',
            args,
        });
    }
}
