import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData } from 'viem';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolLiquidityBootstrappingInput,
} from '../../types';

import { liquidityBoostrappingFactoryAbi } from '@/abi/liquidityBootstrappingFactory';
import { balancerV3Contracts } from '@/utils/balancerV3Contracts';

import { Hex } from '@/types';

export class CreatePoolLiquidityBootstrapping implements CreatePoolBase {
    public buildCall(
        input: CreatePoolLiquidityBootstrappingInput,
    ): CreatePoolBuildCallOutput {
        const callData = this.encodeCall(input);
        return {
            callData,
            to: balancerV3Contracts.LBPoolFactory[input.chainId],
        };
    }

    private encodeCall(input: CreatePoolLiquidityBootstrappingInput): Hex {
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
