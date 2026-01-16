import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData, zeroAddress } from 'viem';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolLiquidityBootstrappingFixedPriceInput,
} from '../../types';

import { fixedPriceLBPoolFactoryAbi_V3 } from '@/abi';

import { Hex } from '@/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export class CreatePoolLiquidityBootstrappingFixedPrice
    implements CreatePoolBase
{
    public buildCall(
        input: CreatePoolLiquidityBootstrappingFixedPriceInput,
    ): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: AddressProvider.FixedPriceLBPoolFactory(input.chainId),
        };
    }

    private encodeCall(
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
