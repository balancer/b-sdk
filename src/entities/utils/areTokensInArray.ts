import { inputValidationError } from '@/utils';
import { Address } from '../../types';

export function areTokensInArray(
    action: string,
    inputTokens: Address[],
    tokens: Address[],
) {
    const _inputTokens = inputTokens.map((t) => t.toLowerCase() as Address);
    const _tokens = tokens.map((t) => t.toLowerCase());
    for (const token of _inputTokens) {
        if (!_tokens.includes(token)) {
            throw inputValidationError(
                action,
                `Token ${token} not found in array [${tokens.join(', ')}]`,
            );
        }
    }
}
