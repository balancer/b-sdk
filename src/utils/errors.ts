export const addLiquiditySingleTokenShouldHaveTokenInIndexError = Error(
    'AddLiquidityKind.SingleToken should have tokenInIndex',
);

export const addLiquidityProportionalUnavailableError = new Error(
    'AddLiquidityKind.Proportional is not available for V3. Please use ProportionalAmountsHelper to calculate proportional amountsIn and use AddLiquidityKind.Unbalanced instead.',
);
