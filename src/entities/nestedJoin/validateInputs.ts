import { NATIVE_ASSETS } from '../../utils';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { NestedPoolState } from '../types';
import { constraintValidation } from '../utils';
import { NestedJoinInput } from './types';

export const validateInputs = (
    input: NestedJoinInput,
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
                `Joining with ${tokenIn} requires it to exist within mainTokens`,
            );
        }
        return TokenAmount.fromRawAmount(tokenIn, amountIn.rawAmount);
    });

    if (input.useNativeAssetAsWrappedAmountIn) {
        if (
            !mainTokens.some((t) =>
                t.isUnderlyingEqual(NATIVE_ASSETS[input.chainId]),
            )
        ) {
            throw new Error(
                'Joining with native asset requires wrapped native asset to exist within mainTokens',
            );
        }
        if (
            !amountsIn.some((a) =>
                a.token.isUnderlyingEqual(NATIVE_ASSETS[input.chainId]),
            )
        ) {
            throw new Error(
                'Joining with native asset requires wrapped native asset to exist within amountsIn',
            );
        }
    }

    return amountsIn;
};
