import { Address } from 'viem';
import { Token } from '@/entities/token';
import {
    AuraBalSwapKind,
    SwapQueryInput,
    AuraBalSwapQueryInput,
} from './types';
import { supportedTokens, auraBalToken } from './constants';
import { SwapKind } from '@/types';
import { ChainId, inputValidationError } from '@/utils';
import { TokenAmount } from '@/entities/tokenAmount';

export function isAuraBalSwap(input: SwapQueryInput): boolean {
    const { tokenIn, tokenOut, kind, swapAmount } = input;
    return (
        isGivenIn(kind) &&
        isAddressEqual(tokenIn, swapAmount) &&
        isMainnet(tokenIn, tokenOut, swapAmount) &&
        hasSupportedTokens(tokenIn, tokenOut)
    );
}

function isMainnet(
    tokenIn: Token,
    tokenOut: Token,
    swapAmount: TokenAmount,
): boolean {
    if (
        !(
            tokenIn.chainId === ChainId.MAINNET &&
            tokenOut.chainId === ChainId.MAINNET &&
            swapAmount.token.chainId === ChainId.MAINNET
        )
    )
        throw inputValidationError('auraBal Swap', 'Must be mainnet.');
    return true;
}

function isAddressEqual(token: Token, amount: TokenAmount): boolean {
    if (!token.isSameAddress(amount.token.address))
        throw inputValidationError(
            'auraBal Swap',
            'tokenIn and swapAmount address must match.',
        );
    return true;
}

function isGivenIn(kind: SwapKind): boolean {
    if (kind !== SwapKind.GivenIn)
        throw inputValidationError('auraBal Swap', 'Must be SwapKind GivenIn.');
    return true;
}

function hasSupportedTokens(tokenIn: Token, tokenOut: Token): boolean {
    const tokenInIsAuraBal = auraBalToken.isSameAddress(tokenIn.address);
    const tokenOutIsAuraBal = auraBalToken.isSameAddress(tokenOut.address);
    if (tokenInIsAuraBal && tokenOutIsAuraBal)
        throw inputValidationError('auraBal Swap', 'Both tokens are auraBal');
    if (!tokenInIsAuraBal && !tokenOutIsAuraBal)
        throw inputValidationError(
            'auraBal Swap',
            'Must have tokenIn or tokenOut as auraBal.',
        );

    if (tokenInIsAuraBal) {
        if (!isSupportedToken(tokenOut))
            throw inputValidationError(
                'auraBal Swap',
                `Unsupported tokenOut ${tokenOut.address}`,
            );
    } else if (tokenOutIsAuraBal) {
        if (!isSupportedToken(tokenIn))
            throw inputValidationError(
                'auraBal Swap',
                `Unsupported tokenIn ${tokenIn.address}`,
            );
    }
    return true;
}

export function parseInputs(input: SwapQueryInput): AuraBalSwapQueryInput {
    const { tokenIn, tokenOut, swapAmount } = input;
    if (!isAuraBalSwap(input))
        throw inputValidationError('auraBal Swap', 'Not A Valid AuraBal Swap');

    const auraBalIn = auraBalToken.isSameAddress(tokenIn.address);
    return {
        kind: auraBalIn
            ? AuraBalSwapKind.FromAuraBal
            : AuraBalSwapKind.ToAuraBal,
        swapToken: auraBalIn ? tokenOut : tokenIn,
        inputAmount: swapAmount,
    };
}

function isSupportedToken(token: Token): boolean {
    return supportedTokens.some((t) => token.isSameAddress(t as Address));
}
