import { NATIVE_ASSETS } from '../../utils';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { NestedPoolState } from '../types';
import { constraintValidation } from '../utils';
import { AddLiquidityNestedInput } from './types';

export const validateInputs = (
    input: AddLiquidityNestedInput,
    nestedPoolState: NestedPoolState,
): TokenAmount[] => {
    constraintValidation(nestedPoolState);
    const mainTokens = nestedPoolState.mainTokens.map(
        (t) => new Token(input.chainId, t.address, t.decimals),
    );

    const amountsIn = input.amountsIn.map((amountIn) => {
        const tokenIn = mainTokens.find((t) =>
            t.isSameAddress(amountIn.address),
        );
        if (tokenIn === undefined) {
            throw new Error(
                `Adding liquidity with ${tokenIn} requires it to exist within mainTokens`,
            );
        }
        return TokenAmount.fromRawAmount(tokenIn, amountIn.rawAmount);
    });

    if (input.sendNativeAsset) {
        if (
            !mainTokens.some((t) =>
                t.isUnderlyingEqual(NATIVE_ASSETS[input.chainId]),
            )
        ) {
            throw new Error(
                'Adding liquidity with native asset requires wrapped native asset to exist within mainTokens',
            );
        }
        if (
            !amountsIn.some((a) =>
                a.token.isUnderlyingEqual(NATIVE_ASSETS[input.chainId]),
            )
        ) {
            throw new Error(
                'Adding liquidity with native asset requires wrapped native asset to exist within amountsIn',
            );
        }
    }

    return amountsIn;
};
