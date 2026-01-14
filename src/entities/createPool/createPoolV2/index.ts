import { PoolType } from '@/types';
import { poolTypeProtocolVersionError } from '@/utils';

import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolInput,
} from '../types';
import { CreatePoolWeightedV2 } from './weighted/createPoolWeighted';

export class CreatePoolV2 implements CreatePoolBase {
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    constructor() {
        this.createPoolTypes = {
            [PoolType.Weighted]: new CreatePoolWeightedV2(),
        };
    }

    private getCreatePool(poolType: string): CreatePoolBase {
        if (!this.createPoolTypes[poolType]) {
            throw poolTypeProtocolVersionError('Create Pool', poolType, 2);
        }
        return this.createPoolTypes[poolType];
    }

    public buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput {
        return this.getCreatePool(input.poolType).buildCall(input);
    }
}
