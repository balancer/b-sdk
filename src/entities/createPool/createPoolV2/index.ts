import { PoolType } from '@/types';
import { CreatePoolComposableStable } from './composableStable/createPoolComposableStable';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolInput,
} from '../types';
import { CreatePoolWeighted } from './weighted/createPoolWeighted';

export class CreatePoolV2 implements CreatePoolBase {
    // TODO: should we allow for custom create pool types?
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    constructor() {
        this.createPoolTypes = {
            [PoolType.Weighted]: new CreatePoolWeighted(),
            [PoolType.ComposableStable]: new CreatePoolComposableStable(),
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
