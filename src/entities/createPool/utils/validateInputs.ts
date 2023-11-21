import { CreatePoolInput } from '../types';

export class ValidateInputs {
    static validateCreatePoolInputs(poolType: string, input: CreatePoolInput) {
        if (poolType.toLowerCase() === 'weighted') {
            if (input.tokens.length > 4) {
                throw new Error('Maximum of 4 tokens allowed');
            }
            if (input.tokens.length < 2) {
                throw new Error('Minimum of 2 tokens required');
            }
            if (input.weights) {
                const weightsSum = input.weights.reduce(
                    (acc, w) => acc + w.weight,
                    0,
                );
                if (weightsSum !== 1) {
                    throw new Error('Weights must sum to 1');
                }
                if (input.tokens.length !== input.weights.length) {
                    throw new Error(
                        'Tokens and weights must be the same length',
                    );
                }
            }
            if (input.rateProviders) {
                if (input.tokens.length !== input.rateProviders.length) {
                    throw new Error(
                        'Tokens and rate providers must be the same length',
                    );
                }
            }
        }
    }
}
