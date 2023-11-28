import { CreatePoolBase, CreatePoolInput } from './types';
import { validateCreatePoolInputs } from './utils/validateInputs';
import { CreatePoolWeighted } from './weighted/createPoolWeighted';

export class CreatePool {
    private readonly createPoolTypes: Record<string, CreatePoolBase> = {};

    constructor() {
        this.createPoolTypes = {
            WEIGHTED: new CreatePoolWeighted(),
        };
    }

    private getCreatePool(poolType: string): CreatePoolBase {
        if (!this.createPoolTypes[poolType]) {
            throw new Error('Unsupported pool type: ${poolType}');
        }
        return this.createPoolTypes[poolType];
    }

    public buildCreatePoolCall(poolType: string, input: CreatePoolInput) {
        validateCreatePoolInputs(poolType, input);
        return this.getCreatePool(poolType).buildCall(input);
    }
}
