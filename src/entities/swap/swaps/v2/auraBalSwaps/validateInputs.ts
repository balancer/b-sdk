import { Address } from 'viem';
import { TokenAmount } from '../../../../tokenAmount';
import { Token } from '@/entities/token';
import { AuraBalSwapKind } from './auraBalSwaps';
import { supportedTokens, auraBAL } from './constants';

export function validateInputs(
    inputAmount: TokenAmount,
    token: Token,
    kind: AuraBalSwapKind,
) {
    if (token.chainId !== 1) throw new Error('auraBal Swaps must be mainnet');

    if (
        kind === AuraBalSwapKind.FromAuraBal &&
        !inputAmount.token.isSameAddress(auraBAL)
    )
        throw new Error(
            `Input Token should be auraBAL: ${inputAmount.token.address}`,
        );

    if (
        kind === AuraBalSwapKind.ToAuraBal &&
        inputAmount.token.isSameAddress(auraBAL)
    )
        throw new Error(
            `Input Token should not be auraBAL: ${inputAmount.token.address}`,
        );
    if (
        kind === AuraBalSwapKind.ToAuraBal &&
        !inputAmount.token.isSameAddress(token.address)
    )
        throw new Error(
            `Input Token and inputAmount should have same address: ${inputAmount.token.address} ${token.address}`,
        );
    if (!isSupportedToken(token))
        throw new Error(
            `Token not supported for auraBal swap: ${token.address}`,
        );
}

export function isSupportedToken(token: Token): boolean {
    return supportedTokens.some((t) => token.isSameAddress(t as Address));
}
