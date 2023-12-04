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
        const weightsSum = input.tokens.reduce(
            (acc, { weight }) => acc + BigInt(weight),
            0n,
        );
        if (weightsSum !== BigInt(1e18)) {
            throw new Error('Weights must sum to 1e18');
        }
        if (input.tokens.find(({ weight }) => BigInt(weight) === 0n)) {
            throw new Error('Weight cannot be 0');
        }
        const tokenAddresses = input.tokens.map(
            ({ tokenAddress }) => tokenAddress,
        );
        if (
            tokenAddresses.some(
                (address, idx) => tokenAddresses.indexOf(address) !== idx,
            )
        ) {
            throw new Error('Duplicate token addresses');
        }
    }
}
