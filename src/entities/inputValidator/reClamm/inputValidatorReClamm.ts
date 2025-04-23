import { InputValidatorBase } from '../inputValidatorBase';
import { CreatePoolReClammInput } from '@/entities/createPool';
import { inputValidationError } from '@/utils';

export class InputValidatorReClamm extends InputValidatorBase {
    validateCreatePool(input: CreatePoolReClammInput) {
        super.validateCreatePool(input);

        if (input.tokens.length > 2) {
            throw inputValidationError(
                'Create Pool',
                'ReClamm pools support a maximum of 2 tokens',
            );
        }
    }
}
