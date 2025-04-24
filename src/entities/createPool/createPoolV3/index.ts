import { PoolType } from '@/types';
import { poolTypeProtocolVersionError } from '@/utils';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolInput,
} from '../types';
import { CreatePoolWeightedV3 } from './weighted/createPoolWeighted';
import { CreatePoolStableV3 } from './stable/createPoolStable';
import { CreatePoolStableSurge } from './stableSurge/createStableSurge';
import { CreatePoolGyroECLP } from './gyroECLP/createPoolGyroECLP';
import { CreatePoolReClamm } from './reClamm/createPoolReClamm';

export class CreatePoolV3 implements CreatePoolBase {
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    constructor() {
        this.createPoolTypes = {
            [PoolType.Weighted]: new CreatePoolWeightedV3(),
            [PoolType.Stable]: new CreatePoolStableV3(),
            [PoolType.StableSurge]: new CreatePoolStableSurge(),
            [PoolType.GyroE]: new CreatePoolGyroECLP(),
            [PoolType.ReClamm]: new CreatePoolReClamm(),
        };
    }

    private getCreatePool(poolType: string): CreatePoolBase {
        if (!this.createPoolTypes[poolType]) {
            throw poolTypeProtocolVersionError('Create Pool', poolType, 3);
        }
        return this.createPoolTypes[poolType];
    }

    public buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput {
        return this.getCreatePool(input.poolType).buildCall(input);
    }
}
