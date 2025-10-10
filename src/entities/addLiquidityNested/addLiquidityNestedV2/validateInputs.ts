import { inputValidationError, NATIVE_ASSETS } from '@/utils';

import { Token } from '../../token';
import { TokenAmount } from '../../tokenAmount';
import { NestedPoolState } from '../../types';
import { AddLiquidityNestedInput } from '../types';
import { AddLiquidityNestedCallInputV2 } from './types';

export const validateQueryInput = (
    input: AddLiquidityNestedInput,
    nestedPoolState: NestedPoolState,
): TokenAmount[] => {
    const mainTokens = nestedPoolState.mainTokens.map(
        (t) => new Token(input.chainId, t.address, t.decimals),
    );
    const amountsIn = input.amountsIn.map((amountIn) => {
        const tokenIn = mainTokens.find((t) =>
            t.isSameAddress(amountIn.address),
        );
        if (tokenIn === undefined) {
            throw inputValidationError(
                'Add Liquidity Nested',
                `Adding liquidity with amountIn address ${amountIn.address} requires it to exist within mainTokens`,
            );
        }
        return TokenAmount.fromRawAmount(tokenIn, amountIn.rawAmount);
    });
    return amountsIn;
};

export const validateBuildCallInput = (
    input: AddLiquidityNestedCallInputV2,
): void => {
    const chainId = input.callsAttributes[0].chainId;
    if (input.wethIsEth) {
        if (
            !input.amountsIn.some((a) =>
                a.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
            )
        ) {
            throw inputValidationError(
                'Add Liquidity Nested',
                'Adding liquidity with native asset requires wrapped native asset to exist within amountsIn',
            );
        }
    }
};
