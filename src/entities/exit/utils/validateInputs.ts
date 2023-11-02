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
        case ExitKind.UNBALANCED:
            areTokensInArray(
                input.amountsOut.map((a) => a.token.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case ExitKind.SINGLE_ASSET:
            areTokensInArray(
                [input.tokenOut],
                poolState.tokens.map((t) => t.address),
            );
        case ExitKind.PROPORTIONAL:
            areTokensInArray([input.bptIn.token.address], [poolState.address]);
        default:
            break;
    }
}