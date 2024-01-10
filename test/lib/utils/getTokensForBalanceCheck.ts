import { Address, PoolState, ZERO_ADDRESS } from '../../../src';

/**
 * Get tokens from the pool formatted for balance check, i.e. [...poolTokens, bpt, eth]
 * @param poolState PoolState
 * @returns Address[]
 */
export function getTokensForBalanceCheck(poolState: PoolState): Address[] {
    // pool tokens, bpt, eth
    const tokens = poolState.tokens
        .filter((t) => t.address !== poolState.address)
        .map((t) => t.address);
    tokens.push(poolState.address);
    tokens.push(ZERO_ADDRESS);
    return tokens;
}
