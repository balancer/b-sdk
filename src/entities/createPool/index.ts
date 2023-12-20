import { PoolType } from '../../types';
import { InputValidator } from '../inputValidator/inputValidator';
import { CreatePoolComposableStable } from './composableStable/createPoolComposableStable';
import { CreatePoolBase, CreatePoolInput } from './types';
import { CreatePoolWeighted } from './weighted/createPoolWeighted';

export * from './types';

export class CreatePool {
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    private readonly inputValidator: InputValidator;

    constructor() {
        this.inputValidator = new InputValidator();
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

    public buildCall(poolType: string, input: CreatePoolInput) {
        this.inputValidator.validateCreatePool(poolType, input);
        return this.getCreatePool(poolType).buildCall(input);
    }
}
