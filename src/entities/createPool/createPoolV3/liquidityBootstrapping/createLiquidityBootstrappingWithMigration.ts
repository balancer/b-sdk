import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData } from 'viem';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolLiquidityBootstrappingWithMigrationInput,
} from '../../types';

import { lBPoolFactoryAbi_V3Extended } from '@/abi';
import { balancerV3Contracts } from '@/utils/balancerV3Contracts';

import { Hex } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export class CreatePoolLiquidityBootstrappingWithMigration
    implements CreatePoolBase
{
    public buildCall(
        input: CreatePoolLiquidityBootstrappingWithMigrationInput,
    ): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: AddressProvider.LBPoolFactory(input.chainId),
        };
    }

    private encodeCall(
        input: CreatePoolLiquidityBootstrappingWithMigrationInput,
    ): Hex {
        const args = [
            input.name || input.symbol, // name can be optional
            input.symbol,
            input.lbpParams,
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
            input.lbpMigrationParams,
        ] as const;
        return encodeFunctionData({
            abi: lBPoolFactoryAbi_V3Extended,
            functionName: 'createWithMigration',
            args,
        });
    }
}
