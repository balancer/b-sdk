import { NATIVE_ASSETS } from '../../utils';
import { Token } from '../token';
import { NestedPoolState } from '../types';
import {
    NestedProportionalExitInput,
    NestedSingleTokenExitInput,
} from './types';

export const validateInputs = (
    input: NestedProportionalExitInput | NestedSingleTokenExitInput,
    nestedPoolState: NestedPoolState,
) => {
    const tokenOut = 'tokenOut' in input ? input.tokenOut : undefined;
    const isProportional = tokenOut === undefined;
    const mainTokens = nestedPoolState.mainTokens.map(
        (token) => new Token(input.chainId, token.address, token.decimals),
    );
    if (isProportional) {
        validateInputsProportional(
            input as NestedProportionalExitInput,
            mainTokens,
        );
    } else {
        validateInputsSingleToken(
            input as NestedSingleTokenExitInput,
            mainTokens,
        );
    }

    return isProportional;
};

const validateInputsProportional = (
    input: NestedProportionalExitInput,
    mainTokens: Token[],
) => {
    if (
        input.useNativeAssetAsWrappedAmountOut &&
        !mainTokens.some((t) =>
            t.isUnderlyingEqual(NATIVE_ASSETS[input.chainId]),
        )
    ) {
        throw new Error(
            'Exiting to native asset requires wrapped native asset to exist within main tokens',
        );
    }
};

const validateInputsSingleToken = (
    input: NestedSingleTokenExitInput,
    mainTokens: Token[],
) => {
    const tokenOut = mainTokens.find((t) => t.isSameAddress(input.tokenOut));

    if (tokenOut === undefined) {
        throw new Error(
            `Exiting to ${input.tokenOut} requires it to exist within main tokens`,
        );
    }

    if (
        input.useNativeAssetAsWrappedAmountOut &&
        !tokenOut.isUnderlyingEqual(NATIVE_ASSETS[input.chainId])
    ) {
        throw new Error(
            'Exiting to native asset requires wrapped native asset to be the tokenOut',
        );
    }
};
