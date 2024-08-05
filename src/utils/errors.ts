import { AddLiquidityKind, RemoveLiquidityKind } from '..';

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

export const addLiquidityProportionalNotSupportedOnPoolTypeError = (
    poolType: string,
) =>
    Error(`Add Liquidity Proportional not supported on pool type: ${poolType}`);

export const addLiquidityProportionalOnlyError = (
    kind: AddLiquidityKind,
    poolType: string,
) =>
    Error(
        `Add Liquidity ${kind} not supported for pool ${poolType}. Use Add Liquidity Proportional`,
    );

export const removeLiquidityProportionalOnlyError = (
    kind: RemoveLiquidityKind,
    poolType: string,
) =>
    Error(
        `Remove Liquidity ${kind} not supported for pool ${poolType}. Use Remove Liquidity Proportional`,
    );

export const buildCallWithPermit2ETHError = Error(
    'buildCallWithPermit2 does not support ETH as input - please use buildCall instead',
);

export const buildCallWithPermit2ProtocolVersionError = Error(
    'buildCall with Permit2 signatures is only available for v3',
);
