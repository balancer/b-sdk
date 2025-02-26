import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData } from 'viem';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreateLiquidityBoostrappingPoolInput,
} from '../../types';

import { liquidityBoostrappingFactoryAbi } from '@/abi/liquidityBootstrappingFactory';
import { LIQUIDITY_BOOTSTRAPPING_FACTORY } from '@/utils';

import { Hex } from '@/types';

export class CreatePoolLiquidityBootstrapping implements CreatePoolBase {
    public buildCall(
        input: CreateLiquidityBoostrappingPoolInput,
    ): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: LIQUIDITY_BOOTSTRAPPING_FACTORY[input.chainId],
        };
    }

    private encodeCall(input: CreateLiquidityBoostrappingPoolInput): Hex {
        const args = [
            input.name,
            input.symbol,
            input.lbpParams,
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
        ];
        return encodeFunctionData({
            abi: liquidityBoostrappingFactoryAbi,
            functionName: 'create',
            args,
        });
    }
}
