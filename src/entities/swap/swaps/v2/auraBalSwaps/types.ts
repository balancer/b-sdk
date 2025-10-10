import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { SwapKind } from '@/types';

export type SwapQueryInput = {
    tokenIn: Token;
    tokenOut: Token;
    kind: SwapKind;
    swapAmount: TokenAmount;
};

export interface AuraBalSwapQueryInput {
    kind: AuraBalSwapKind;
    swapToken: Token;
    inputAmount: TokenAmount;
}

export type AuraBalSwapQueryOutput = {
    inputAmount: TokenAmount;
    expectedAmountOut: TokenAmount;
    kind: AuraBalSwapKind;
};

export enum AuraBalSwapKind {
    FromAuraBal = 0,
    ToAuraBal = 1,
}
