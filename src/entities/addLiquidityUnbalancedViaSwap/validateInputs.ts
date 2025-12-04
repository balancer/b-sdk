import { SDKError } from '@/utils';
import { AddLiquidityUnbalancedViaSwapInput } from './types';

export const validateAddLiquidityUnbalancedViaSwapInput = (
    input: AddLiquidityUnbalancedViaSwapInput,
): void => {
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

    // Validate that the exactToken in Index in the amountsIn array is not 0
    // Because this is not a reasonable operation to do.
    if (input.amountsIn[input.exactTokenIndex].rawAmount == 0n) {
        throw new SDKError(
            'AddLiquidityUnbalancedViaSwap',
            'validateInput',
            'Exact token amount must be greater than 0',
        );
    }
};
