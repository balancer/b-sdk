import { inputValidationError, NATIVE_ASSETS } from '../../../utils';
import { BaseToken } from '../../baseToken';
import { NestedPoolState } from '../../types';
import {
    RemoveLiquidityNestedCallInputV2,
    RemoveLiquidityNestedProportionalInputV2,
    RemoveLiquidityNestedSingleTokenInputV2,
} from './types';

export const validateQueryInput = (
    input:
        | RemoveLiquidityNestedProportionalInputV2
        | RemoveLiquidityNestedSingleTokenInputV2,
    nestedPoolState: NestedPoolState,
) => {
    const tokenOut = 'tokenOut' in input ? input.tokenOut : undefined;
    const isProportional = tokenOut === undefined;
    const mainTokens = nestedPoolState.mainTokens.map(
        (token) => new BaseToken(input.chainId, token.address, token.decimals),
    );
    if (!isProportional) {
        validateInputsSingleToken(
            input as RemoveLiquidityNestedSingleTokenInputV2,
            mainTokens,
        );
    }

    return isProportional;
};

const validateInputsSingleToken = (
    input: RemoveLiquidityNestedSingleTokenInputV2,
    mainTokens: BaseToken[],
) => {
    const tokenOut = mainTokens.find((t) => t.isSameAddress(input.tokenOut));

    if (tokenOut === undefined) {
        throw inputValidationError(
            'Remove Liquidity Nested',
            `Removing liquidity to ${input.tokenOut} requires it to exist within mainTokens`,
        );
    }
};

export const validateBuildCallInput = (
    input: RemoveLiquidityNestedCallInputV2,
) => {
    if (
        input.wethIsEth &&
        !input.amountsOut.some((a) =>
            a.token.isSameAddress(NATIVE_ASSETS[input.chainId].wrapped),
        )
    ) {
        throw inputValidationError(
            'Remove Liquidity Nested',
            'Removing liquidity to native asset requires wrapped native asset to exist within amountsOut',
        );
    }
};
