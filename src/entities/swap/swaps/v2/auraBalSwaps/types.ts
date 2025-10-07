import { BaseToken } from '@/entities/baseToken';
import { TokenAmount } from '@/entities/tokenAmount';
import { SwapKind } from '@/types';

export type SwapQueryInput = {
    tokenIn: BaseToken;
    tokenOut: BaseToken;
    kind: SwapKind;
    swapAmount: TokenAmount;
};

export interface AuraBalSwapQueryInput {
    kind: AuraBalSwapKind;
    swapToken: BaseToken;
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
