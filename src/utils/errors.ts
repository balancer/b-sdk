import { AddLiquidityKind, RemoveLiquidityKind } from '..';

export const removeLiquidityMissingTokenOutIndexError = () =>
    new SDKError(
        'Input Validation',
        'Remove Liquidity SingleTokenExactIn',
        'Remove Liquidity SingleTokenExactIn should have tokenOutIndex',
    );

export const addLiquidityMissingTokenInIndexError = () =>
    new SDKError(
        'Input Validation',
        'Add Liquidity SingleToken',
        'Add Liquidity SingleToken should have tokenInIndex',
    );

export const removeLiquidityUnbalancedProtocolVersionError = () =>
    new SDKError(
        'Input Validation',
        'Remove Liquidity Unbalanced',
        'Remove Liquidity Unbalanced not supported on Balancer v3',
    );

export const addLiquidityPoolTypeError = (
    kind: AddLiquidityKind,
    poolType: string,
) =>
    new SDKError(
        'Input Validation',
        `Add Liquidity ${kind}`,
        `Add Liquidity ${kind} not supported for pool type ${poolType}`,
    );

export const addLiquidityProportionalOnlyError = (
    kind: AddLiquidityKind,
    poolType: string,
) =>
    new SDKError(
        'Input Validation',
        `Add Liquidity ${kind}`,
        `Add Liquidity ${kind} not supported for pool type ${poolType}. Use Add Liquidity Proportional`,
    );

export const removeLiquidityProportionalOnlyError = (
    kind: RemoveLiquidityKind,
    poolType: string,
) =>
    new SDKError(
        'Input Validation',
        `Remove Liquidity ${kind}`,
        `Remove Liquidity ${kind} not supported for pool type ${poolType}. Use Remove Liquidity Proportional`,
    );

export const buildCallWithPermit2ProtocolVersionError = () =>
    new SDKError(
        'Input Validation',
        'buildCallWithPermit2',
        'buildCall with Permit2 signatures is available for Balancer v3 only',
    );

export const missingParameterError = (
    action: string,
    param: string,
    protocolVersion: number,
) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} missing parameter: ${param} for Balancer v${protocolVersion}`,
    );

export const exceedingParameterError = (
    action: string,
    param: string,
    protocolVersion: number,
) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} exceeding parameter: ${param} for Balancer v${protocolVersion}`,
    );

export const addLiquidityNativeAssetError = (poolType: string) =>
    new SDKError(
        'Input Validation',
        'Add Liquidity With Native Asset',
        `Add Liquidity With Native Asset not supported for ${poolType}`,
    );

export const protocolVersionError = (action: string, protocolVersion: number) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} not supported for Balancer v${protocolVersion}`,
    );

export class SDKError extends Error {
    constructor(
        public name: string,
        public action: string,
        message: string,
    ) {
        super(message);
        this.name = name;
        this.action = action;

        Object.setPrototypeOf(this, SDKError.prototype);
    }
}
