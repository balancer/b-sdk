import { Address, PoolStateInput, ZERO_ADDRESS } from '../../../src';

/**
 * Get tokens from the pool formatted for balance check, i.e. [...poolTokens, bpt, eth]
 * @param poolStateInput PoolStateInput
 * @returns Address[]
 */
export function getTokensForBalanceCheck(
    poolStateInput: PoolStateInput,
): Address[] {
    // pool tokens, bpt, eth
    const tokens = poolStateInput.tokens
        .filter((t) => t.address !== poolStateInput.address)
        .map((t) => t.address);
    tokens.push(poolStateInput.address);
    tokens.push(ZERO_ADDRESS);
    return tokens;
}
