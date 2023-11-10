import { AddLiquidityInput, AddLiquidityKind } from '../types';
import { PoolStateInput } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';

export function validateInputs(
    input: AddLiquidityInput,
    poolState: PoolStateInput,
) {
    const bptIndex = poolState.tokens.findIndex(
        (t) => t.address === poolState.address,
    );
    if (['PHANTOM_STABLE'].includes(poolState.type) && bptIndex < 0) {
        throw new Error('Pool Tokens does not contain BPT');
    }
    switch (input.kind) {
        case AddLiquidityKind.Init:
        case AddLiquidityKind.Unbalanced:
            areTokensInArray(
                input.amountsIn.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case AddLiquidityKind.SingleAsset:
            areTokensInArray(
                [input.tokenIn],
                poolState.tokens.map((t) => t.address),
            );
        case AddLiquidityKind.Proportional:
            areTokensInArray([input.bptOut.address], [poolState.address]);
        default:
            break;
    }
}
