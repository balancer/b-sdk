import { getRandomBytes32 } from '@/entities/utils/getRandomBytes32';
import { encodeFunctionData } from 'viem';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolLiquidityBootstrappingInput,
} from '../../types';

import { lBPoolFactoryAbi_V3Extended } from '@/abi';
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
            input.name || input.symbol, // name can be optional
            input.symbol,
            input.lbpParams,
            input.swapFeePercentage,
            input.salt || getRandomBytes32(),
        ] as const;
        return encodeFunctionData({
            abi: lBPoolFactoryAbi_V3Extended,
            functionName: 'create',
            args,
        });
    }
}
