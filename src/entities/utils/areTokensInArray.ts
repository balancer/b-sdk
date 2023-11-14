import { Address } from '../../types';

export function areTokensInArray(tokens: Address[], tokenArray: Address[]) {
    const sanitisedTokens = tokens.map((t) => t.toLowerCase() as Address);
    const sanitisedTokenArray = tokenArray.map((t) => t.toLowerCase());
    for (const token of sanitisedTokens) {
        if (!sanitisedTokenArray.includes(token)) {
            throw new Error(`Token ${token} not found in array`);
        }
    }
}
