import { InputValidator } from '../inputValidator/inputValidator';
import { CreatePoolComposableStable } from './composableStable/createPoolComposableStable';
import { CreatePoolBase, CreatePoolInput } from './types';
import { CreatePoolWeighted } from './weighted/createPoolWeighted';

export class CreatePool {
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    private readonly inputValidator: InputValidator;

    constructor() {
        this.inputValidator = new InputValidator();
        this.createPoolTypes = {
            WEIGHTED: new CreatePoolWeighted(),
            PHANTOM_STABLE: new CreatePoolComposableStable(),
        };
    }

    private getCreatePool(poolType: string): CreatePoolBase {
        if (!this.createPoolTypes[poolType]) {
            throw new Error('Unsupported pool type: ${poolType}');
        }
        return this.createPoolTypes[poolType];
    }

    public buildCreatePoolCall(poolType: string, input: CreatePoolInput) {
        this.inputValidator.validateCreatePool(poolType, input);
        return this.getCreatePool(poolType).buildCall(input);
    }
}
