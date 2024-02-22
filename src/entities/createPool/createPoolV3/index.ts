import { PoolType } from '@/types';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolInput,
} from '../types';
import { CreatePoolWeightedV3 } from './weighted/createPoolWeighted';

export class CreatePoolV3 implements CreatePoolBase {
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    constructor() {
        this.createPoolTypes = {
            [PoolType.Weighted]: new CreatePoolWeightedV3(),
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
