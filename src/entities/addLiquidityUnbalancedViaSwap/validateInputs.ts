import { SDKError } from '@/utils';
import { AddLiquidityUnbalancedViaSwapInput } from './types';
import { PoolState } from '../types';

export const validateAddLiquidityUnbalancedViaSwapInput = (
    input: AddLiquidityUnbalancedViaSwapInput,
    poolState: PoolState,
): void => {
    if (poolState.type !== 'RECLAMM') {
        throw new SDKError(
            'AddLiquidityUnbalancedViaSwap',
            'validateInput',
            'Weighted pools are not supported for unbalanced via swap',
        );
    }
    if (!input.pool) {
        throw new SDKError(
            'AddLiquidityUnbalancedViaSwap',
            'validateInput',
            'Pool address is required',
        );
    }

    if (!input.amountsIn || input.amountsIn.length !== 2) {
        throw new SDKError(
            'AddLiquidityUnbalancedViaSwap',
            'validateInput',
            'Exactly 2 token amounts are required for unbalanced via swap',
        );
    }

    if (
        input.exactTokenIndex < 0 ||
        input.exactTokenIndex >= input.amountsIn.length
    ) {
        throw new SDKError(
            'AddLiquidityUnbalancedViaSwap',
            'validateInput',
            'exactTokenIndex must be 0 or 1 for two-token pools',
        );
    }

    // Validate that at least one amount is greater than 0
    for (const amount of input.amountsIn) {
        if (amount.rawAmount > 0n) {
            return;
        }
    }

    // Validate that no token is the pool address
    for (const amount of input.amountsIn) {
        if (amount.address.toLowerCase() === input.pool.toLowerCase()) {
            throw new SDKError(
                'AddLiquidityUnbalancedViaSwap',
                'validateInput',
                'Token cannot be the same as pool address',
            );
        }
    }
};
