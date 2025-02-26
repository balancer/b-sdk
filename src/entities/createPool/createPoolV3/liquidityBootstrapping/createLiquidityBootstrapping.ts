// The goal is to create a new class. This class will have two methods. One is called
// buildCall and one is encodeCall.
// The encodeCall function takes a type of CreateLiquidityBootstrappingInput and returns a Hex type.
// The Hex value is basically the callData to create the pool from the factory
// This class essentially uses the encodeFunction data from the viem library to create the callData

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
        // this function encodes the smart contract input arguments
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
