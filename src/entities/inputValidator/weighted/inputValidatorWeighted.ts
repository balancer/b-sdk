import {
    CreatePoolV2WeightedInput,
    CreatePoolV3WeightedInput,
} from '../../createPool/types';
import { InputValidatorBase } from '../inputValidatorBase';

export class InputValidatorWeighted extends InputValidatorBase {
    validateCreatePool(
        input: CreatePoolV2WeightedInput | CreatePoolV3WeightedInput,
    ) {
        super.validateCreatePool(input);
        if (input.tokens.length > 8) {
            throw new Error('Weighted pools can have a maximum of 8 tokens');
        }
        const weightsSum = input.tokens.reduce(
            (acc, { weight }) => acc + weight,
            0n,
        );
        if (weightsSum !== BigInt(1e18)) {
            throw new Error('Weights must sum to 1e18');
        }
        if (input.tokens.find(({ weight }) => weight === 0n)) {
            throw new Error('Weight cannot be 0');
        }
    }
}
