export const addLiquiditySingleTokenShouldHaveTokenInIndexError = Error(
    'AddLiquidityKind.SingleToken should have tokenInIndex',
);

export const addLiquidityProportionalUnavailableError = new Error(
    'AddLiquidityKind.Proportional is not available for V3. Please use ProportionalAmountsHelper to calculate proportional amountsIn and use AddLiquidityKind.Unbalanced instead.',
);

export const removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError =
    Error('RemoveLiquidityKind.SingleTokenExactIn should have tokenOutIndex');

export const removeLiquidityUnbalancedNotSupportedOnV3 = Error(
    'Unbalanced remove liquidity not supported on V3',
);
