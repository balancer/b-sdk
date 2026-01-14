import { AddLiquidityBoostedInput } from '@/entities/addLiquidityBoosted/types';
import { AddLiquidityInput, AddLiquidityKind } from '../../addLiquidity/types';
import {
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
} from '../../removeLiquidity/types';
import { PoolState, PoolStateWithUnderlyings } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';
import {
    inputValidationError,
    isSameAddress,
    protocolVersionError,
} from '@/utils';
import { Address } from '@/types';

export const validateTokensAddLiquidity = (
    addLiquidityInput: AddLiquidityInput,
    poolState: PoolState,
) => {
    switch (addLiquidityInput.kind) {
        case AddLiquidityKind.Unbalanced:
            areTokensInArray(
                'Add Liquidity Unbalanced',
                addLiquidityInput.amountsIn.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case AddLiquidityKind.SingleToken:
            areTokensInArray(
                'Add Liquidity Single Token',
                [addLiquidityInput.tokenIn],
                poolState.tokens.map((t) => t.address),
            );
            break;
        case AddLiquidityKind.Proportional:
            areTokensInArray(
                'Add Liquidity Proportional',
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
                'Remove Liquidity Unbalanced',
                removeLiquidityInput.amountsOut.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case RemoveLiquidityKind.SingleTokenExactOut:
            areTokensInArray(
                'Remove Liquidity Single Token Exact Out',
                [removeLiquidityInput.amountOut.address],
                poolState.tokens.map((t) => t.address),
            );
            break;
        case RemoveLiquidityKind.SingleTokenExactIn:
            areTokensInArray(
                'Remove Liquidity Single Token Exact In',
                [removeLiquidityInput.tokenOut],
                poolState.tokens.map((t) => t.address),
            );
            break;
        case RemoveLiquidityKind.Proportional:
            areTokensInArray(
                'Remove Liquidity Proportional',
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
        'Remove Liquidity Recovery',
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

export const validateTokensAddLiquidityBoosted = (
    addLiquidityInput: AddLiquidityBoostedInput,
    poolState: PoolStateWithUnderlyings,
) => {
    //check if poolState.protocolVersion is 3
    if (poolState.protocolVersion !== 3) {
        throw protocolVersionError(
            'Add Liquidity Boosted',
            poolState.protocolVersion,
        );
    }

    if (addLiquidityInput.kind === AddLiquidityKind.Unbalanced) {
        // List of all tokens that can be added to the pool
        const poolTokens = poolState.tokens
            .flatMap((token) => [
                token.address.toLowerCase(),
                token.underlyingToken?.address.toLowerCase(),
            ])
            .filter(Boolean);

        addLiquidityInput.amountsIn.forEach((a) => {
            if (!poolTokens.includes(a.address.toLowerCase() as Address)) {
                throw inputValidationError(
                    'Add Liquidity Boosted',
                    `amountIn address ${a.address} should exist in poolState tokens`,
                );
            }
        });
    }

    if (addLiquidityInput.kind === AddLiquidityKind.Proportional) {
        // if referenceAmount is not the BPT, it must be included in tokensIn
        if (
            !isSameAddress(
                addLiquidityInput.referenceAmount.address,
                poolState.address,
            )
        ) {
            if (
                addLiquidityInput.tokensIn.findIndex((tokenIn) =>
                    isSameAddress(
                        tokenIn,
                        addLiquidityInput.referenceAmount.address,
                    ),
                ) === -1
            ) {
                throw inputValidationError(
                    'Add Liquidity Boosted',
                    `referenceAmount address ${addLiquidityInput.referenceAmount.address} should exist in tokensIn`,
                );
            }
        }
    }
};
