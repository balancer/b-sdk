import { AddLiquidityKind } from '..';

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

export const missingParameterError = (
    action: string,
    param: string,
    protocolVersion: number,
) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} input missing parameter ${param} for Balancer v${protocolVersion}`,
    );

export const exceedingParameterError = (
    action: string,
    param: string,
    protocolVersion: number,
) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} input exceeding parameter ${param} for Balancer v${protocolVersion}`,
    );

export const protocolVersionError = (
    action: string,
    protocolVersion: number,
    suggestion?: string,
) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} not supported for Balancer v${protocolVersion}.`,
        suggestion,
    );

export const poolTypeError = (
    action: string,
    poolType: string,
    suggestion?: string,
) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} not supported for pool type ${poolType}.`,
        suggestion,
    );

export const poolTypeProtocolVersionError = (
    action: string,
    poolType: string,
    protocolVersion: number,
) =>
    new SDKError(
        'Input Validation',
        action,
        `${action} not supported for pool type ${poolType} on Balancer v${protocolVersion}.`,
    );

export const inputValidationError = (action: string, message: string) =>
    new SDKError('Input Validation', action, message);

export class SDKError extends Error {
    constructor(
        public name: string,
        public action: string,
        public message: string,
        public suggestion?: string,
    ) {
        const _message = suggestion ? `${message} ${suggestion}` : message;
        super(_message);
        this.name = name;
        this.action = action;

        Object.setPrototypeOf(this, SDKError.prototype);
    }
}
