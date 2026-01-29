import { SDKError } from '@/utils';
import { AddLiquidityUnbalancedViaSwapInput } from './types';
import { PoolState } from '../types';
import { validateTokensAddLiquidity } from '../inputValidator/utils/validateTokens';
import { AddLiquidityKind } from '../addLiquidity/types';

export const validateAddLiquidityUnbalancedViaSwapInput = (
    input: AddLiquidityUnbalancedViaSwapInput,
    poolState: PoolState,
): void => {
    validateTokensAddLiquidity(
        {
            ...input,
            kind: AddLiquidityKind.Unbalanced,
            amountsIn: [input.maxAdjustableAmountIn],
        },
        poolState,
    );

    if (poolState.tokens.length !== 2) {
        throw new SDKError(
            'Input Validation',
            'AddLiquidityUnbalancedViaSwap',
            'Pool should have exactly 2 tokens',
        );
    }

    if (input.maxAdjustableAmountIn.rawAmount <= 0n) {
        throw new SDKError(
            'Input Validation',
            'AddLiquidityUnbalancedViaSwap',
            'maxAdjustableAmountIn should be greater than zero',
        );
    }
};
