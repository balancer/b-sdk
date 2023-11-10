import { ExitInput, ExitKind } from '../types';
import { PoolStateInput } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';

export function validateInputs(input: ExitInput, poolState: PoolStateInput) {
    const bptIndex = poolState.tokens.findIndex(
        (t) => t.address === poolState.address,
    );
    if (['PHANTOM_STABLE'].includes(poolState.type) && bptIndex < 0) {
        throw new Error('Pool Tokens does not contain BPT');
    }
    switch (input.kind) {
        case ExitKind.Unbalanced:
            areTokensInArray(
                input.amountsOut.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case ExitKind.SingleAsset:
            areTokensInArray(
                [input.tokenOut],
                poolState.tokens.map((t) => t.address),
            );
        case ExitKind.Proportional:
            areTokensInArray([input.bptIn.address], [poolState.address]);
        default:
            break;
    }
}
