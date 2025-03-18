import { AddLiquidityInput, AddLiquidityKind } from '../../addLiquidity/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { PoolState } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';
import { inputValidationError } from '@/utils';

export const validateTokensAddLiquidity = (
    addLiquidityInput: AddLiquidityInput,
    poolState: PoolState,
) => {
    switch (addLiquidityInput.kind) {
        case AddLiquidityKind.Unbalanced:
            areTokensInArray(
                addLiquidityInput.amountsIn.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case AddLiquidityKind.SingleToken:
            areTokensInArray(
                [addLiquidityInput.tokenIn],
                poolState.tokens.map((t) => t.address),
            );
            break;
        case AddLiquidityKind.Proportional:
            areTokensInArray(
                [addLiquidityInput.referenceAmount.address],
                [poolState.address, ...poolState.tokens.map((t) => t.address)], // reference amount can be any pool token or pool BPT
            );
            break;
        default:
            break;
    }
};

export const validateTokensRemoveLiquidity = (
    removeLiquidityInput: RemoveLiquidityInput,
    poolState: PoolState,
) => {
    switch (removeLiquidityInput.kind) {
        case RemoveLiquidityKind.Unbalanced:
            areTokensInArray(
                removeLiquidityInput.amountsOut.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case RemoveLiquidityKind.SingleTokenExactOut:
            areTokensInArray(
                [removeLiquidityInput.amountOut.address],
                poolState.tokens.map((t) => t.address),
            );
            break;
        case RemoveLiquidityKind.SingleTokenExactIn:
            areTokensInArray(
                [removeLiquidityInput.tokenOut],
                poolState.tokens.map((t) => t.address),
            );
            break;
        case RemoveLiquidityKind.Proportional:
            areTokensInArray(
                [removeLiquidityInput.bptIn.address],
                [poolState.address],
            );
            break;
    }
};

export const validateTokensRemoveLiquidityRecovery = (
    removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput,
    poolState: PoolState,
) => {
    areTokensInArray(
        [removeLiquidityRecoveryInput.bptIn.address],
        [poolState.address],
    );
};

export const validatePoolHasBpt = (action: string, poolState: PoolState) => {
    const { tokens, address } = poolState;
    const bptIndex = tokens.findIndex((t) => t.address === address);
    if (bptIndex < 0) {
        throw inputValidationError(
            action,
            'poolState should have BPT token included for Composable Stable pools',
        );
    }
};

export const validateCreatePoolTokens = (tokens: { address: string }[]) => {
    const tokenAddresses = tokens.map((t) => t.address);
    if (tokenAddresses.length !== new Set(tokenAddresses).size) {
        throw inputValidationError('Create Pool', 'Duplicate token addresses');
    }
    if (tokens.length < 2) {
        throw inputValidationError(
            'Create Pool',
            'Minimum of 2 tokens required',
        );
    }
};
