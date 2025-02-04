import { InputValidator } from '../inputValidator/inputValidator';
import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolInput,
} from './types';
import { CreatePoolV2 } from './createPoolV2';
import { CreatePoolV3 } from './createPoolV3';

export * from './types';
export * from './createPoolV3/gyroECLP/createPoolGyroECLP';

export class CreatePool implements CreatePoolBase {
    private readonly inputValidator: InputValidator;

    constructor() {
        this.inputValidator = new InputValidator();
    }

    public buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput {
        this.inputValidator.validateCreatePool(input);
        switch (input.protocolVersion) {
            case 2:
                return new CreatePoolV2().buildCall(input);
            case 3:
                return new CreatePoolV3().buildCall(input);
        }
    }
}
