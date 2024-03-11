import { NATIVE_ASSETS } from '../../utils';
import { Token } from '../token';
import { TokenAmount } from '../tokenAmount';
import { NestedPoolState } from '../types';
import { AddLiquidityNestedCallInput, AddLiquidityNestedInput } from './types';

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
            throw new Error(
                `Adding liquidity with ${amountIn.address} requires it to exist within mainTokens`,
            );
        }
        return TokenAmount.fromRawAmount(tokenIn, amountIn.rawAmount);
    });
    return amountsIn;
};

export const validateBuildCallInput = (
    input: AddLiquidityNestedCallInput,
): void => {
    const chainId = input.callsAttributes[0].chainId;
    if (input.wethIsEth) {
        if (
            !input.amountsIn.some((a) =>
                a.token.isUnderlyingEqual(NATIVE_ASSETS[chainId]),
            )
        ) {
            throw new Error(
                'Adding liquidity with native asset requires wrapped native asset to exist within amountsIn',
            );
        }
    }
};
