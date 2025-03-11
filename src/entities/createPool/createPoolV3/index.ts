import { PoolType } from '@/types';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolInput,
} from '../types';
import { CreatePoolWeightedV3 } from './weighted/createPoolWeighted';
import { CreatePoolStableV3 } from './stable/createPoolStable';
import { CreatePoolStableSurge } from './stableSurge/createStableSurge';
import { CreatePoolGyroECLP } from './gyroECLP/createPoolGyroECLP';
import { CreatePoolLiquidityBootstrapping } from './liquidityBootstrapping/createLiquidityBootstrapping';

export class CreatePoolV3 implements CreatePoolBase {
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    constructor() {
        this.createPoolTypes = {
            [PoolType.Weighted]: new CreatePoolWeightedV3(),
            [PoolType.Stable]: new CreatePoolStableV3(),
            [PoolType.StableSurge]: new CreatePoolStableSurge(),
            [PoolType.GyroE]: new CreatePoolGyroECLP(),
            [PoolType.LiquidityBootstrapping]:
                new CreatePoolLiquidityBootstrapping(),
        };
    }

    private getCreatePool(poolType: string): CreatePoolBase {
        if (!this.createPoolTypes[poolType]) {
            throw new Error('Unsupported pool type: ${poolType}');
        }
        return this.createPoolTypes[poolType];
    }

    public buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput {
        return this.getCreatePool(input.poolType).buildCall(input);
    }
}
