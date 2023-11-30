import { CreatePoolInput } from '../types';

export function validateCreatePoolInputs(
    poolType: string,
    input: CreatePoolInput,
) {
    if (poolType.toLowerCase() === 'weighted') {
        if (input.tokens.length > 4) {
            throw new Error('Maximum of 4 tokens allowed');
        }
        if (input.tokens.length < 2) {
            throw new Error('Minimum of 2 tokens required');
        }
        const weightsSum = input.weights.reduce(
            (acc, w) => acc + BigInt(w.weight),
            0n,
        );
        if (weightsSum !== BigInt(1e18)) {
            throw new Error('Weights must sum to 1e18');
        }
        if (input.tokens.length !== input.weights.length) {
            throw new Error('Tokens and weights must be the same length');
        }
        if (input.tokens.length !== input.rateProviders.length) {
            throw new Error(
                'Tokens and rateProviders must have the same length',
            );
        }
        if (input.tokens.length !== input.weights.length) {
            throw new Error('Tokens and weights must have the same length');
        }
    }
}
