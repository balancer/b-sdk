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
            amountsIn: [input.expectedAdjustableAmountIn],
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

    if (input.expectedAdjustableAmountIn.rawAmount <= 0n) {
        throw new SDKError(
            'Input Validation',
            'AddLiquidityUnbalancedViaSwap',
            'expectedAdjustableAmountIn should be greater than zero',
        );
    }
};
