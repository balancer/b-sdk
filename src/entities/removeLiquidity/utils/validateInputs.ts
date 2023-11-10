import { RemoveLiquidityInput, RemoveLiquidityKind } from '../types';
import { PoolStateInput } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';

export function validateInputs(
    input: RemoveLiquidityInput,
    poolState: PoolStateInput,
) {
    const bptIndex = poolState.tokens.findIndex(
        (t) => t.address === poolState.address,
    );
    if (['PHANTOM_STABLE'].includes(poolState.type) && bptIndex < 0) {
        throw new Error('Pool Tokens does not contain BPT');
    }
    switch (input.kind) {
        case RemoveLiquidityKind.Unbalanced:
            areTokensInArray(
                input.amountsOut.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case RemoveLiquidityKind.SingleAsset:
            areTokensInArray(
                [input.tokenOut],
                poolState.tokens.map((t) => t.address),
            );
        case RemoveLiquidityKind.Proportional:
            areTokensInArray([input.bptIn.address], [poolState.address]);
        default:
            break;
    }
}
