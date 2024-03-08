import { NATIVE_ASSETS } from '@/utils';
import { AddLiquidityAmounts } from '../types';
import { AddLiquidityBaseBuildCallInput, AddLiquidityKind } from './types';

export const getAmountsCall = (
    input: AddLiquidityBaseBuildCallInput,
): AddLiquidityAmounts => {
    switch (input.addLiquidityKind) {
        case AddLiquidityKind.Unbalanced: {
            const minimumBpt = input.slippage.applyTo(input.bptOut.amount, -1);
            return {
                minimumBpt,
                maxAmountsIn: input.amountsIn.map((a) => a.amount),
                tokenInIndex: input.tokenInIndex,
            };
        }
        case AddLiquidityKind.SingleToken:
        case AddLiquidityKind.Proportional: {
            return {
                minimumBpt: input.bptOut.amount,
                maxAmountsIn: input.amountsIn.map((a) =>
                    input.slippage.applyTo(a.amount),
                ),
                tokenInIndex: input.tokenInIndex,
            };
        }
    }
};

export const getValue = (input: AddLiquidityBaseBuildCallInput): bigint => {
    let value = 0n;
    if (input.wethIsEth) {
        value =
            input.amountsIn.find(
                (a) => a.token.address === NATIVE_ASSETS[input.chainId].wrapped,
            )?.amount ?? 0n;
    }
    return value;
};
