import { Address } from 'viem';
import { Token } from '@/entities/token';
import { AuraBalSwapKind, SwapQueryInput } from './types';
import { supportedTokens, auraBalToken } from './constants';
import { SwapKind } from '@/types';
import { TokenAmount } from '@/entities/tokenAmount';

export interface AuraBalSwapQueryInput {
    kind: AuraBalSwapKind;
    swapToken: Token;
    inputAmount: TokenAmount;
}

export function isAuraBalSwap(input: SwapQueryInput): boolean {
    const { tokenIn, tokenOut, kind } = input;
    return (
        kind === SwapKind.GivenIn &&
        tokenIn.chainId === 1 &&
        tokenOut.chainId === 1 &&
        (auraBalToken.isSameAddress(tokenIn.address) ||
            auraBalToken.isSameAddress(tokenOut.address)) &&
        (isSupportedToken(tokenIn) || isSupportedToken(tokenOut))
    );
}

export function parseInputs(input: SwapQueryInput): AuraBalSwapQueryInput {
    const { tokenIn, tokenOut, swapAmount } = input;
    if (
        !isAuraBalSwap(input) ||
        !tokenIn.isSameAddress(swapAmount.token.address)
    )
        throw Error('Not A Valid AuraBal Swap');

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
