import { NATIVE_ASSETS } from '../../utils';
import { Token } from '../token';
import { NestedPoolState } from '../types';
import {
    RemoveLiquidityNestedProportionalInput,
    RemoveLiquidityNestedSingleTokenInput,
} from './types';

export const validateInputs = (
    input:
        | RemoveLiquidityNestedProportionalInput
        | RemoveLiquidityNestedSingleTokenInput,
    nestedPoolState: NestedPoolState,
) => {
    const tokenOut = 'tokenOut' in input ? input.tokenOut : undefined;
    const isProportional = tokenOut === undefined;
    const mainTokens = nestedPoolState.mainTokens.map(
        (token) => new Token(input.chainId, token.address, token.decimals),
    );
    if (isProportional) {
        validateInputsProportional(
            input as RemoveLiquidityNestedProportionalInput,
            mainTokens,
        );
    } else {
        validateInputsSingleToken(
            input as RemoveLiquidityNestedSingleTokenInput,
            mainTokens,
        );
    }

    return isProportional;
};

const validateInputsProportional = (
    input: RemoveLiquidityNestedProportionalInput,
    mainTokens: Token[],
) => {
    if (
        input.useNativeAssetAsWrappedAmountOut &&
        !mainTokens.some((t) =>
            t.isUnderlyingEqual(NATIVE_ASSETS[input.chainId]),
        )
    ) {
        throw new Error(
            'Removing liquidity to native asset requires wrapped native asset to exist within main tokens',
        );
    }
};

const validateInputsSingleToken = (
    input: RemoveLiquidityNestedSingleTokenInput,
    mainTokens: Token[],
) => {
    const tokenOut = mainTokens.find((t) => t.isSameAddress(input.tokenOut));

    if (tokenOut === undefined) {
        throw new Error(
            `Removing liquidity to ${input.tokenOut} requires it to exist within main tokens`,
        );
    }

    if (
        input.useNativeAssetAsWrappedAmountOut &&
        !tokenOut.isUnderlyingEqual(NATIVE_ASSETS[input.chainId])
    ) {
        throw new Error(
            'Removing liquidity to native asset requires wrapped native asset to be the tokenOut',
        );
    }
};
