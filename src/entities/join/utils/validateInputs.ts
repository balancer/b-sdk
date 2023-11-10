import { JoinInput, JoinKind } from '../types';
import { PoolStateInput } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';

export function validateInputs(input: JoinInput, poolState: PoolStateInput) {
    const bptIndex = poolState.tokens.findIndex(
        (t) => t.address === poolState.address,
    );
    if (['PHANTOM_STABLE'].includes(poolState.type) && bptIndex < 0) {
        throw new Error('Pool Tokens does not contain BPT');
    }
    switch (input.kind) {
        case JoinKind.Init:
        case JoinKind.Unbalanced:
            areTokensInArray(
                input.amountsIn.map((a) => a.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case JoinKind.SingleAsset:
            areTokensInArray(
                [input.tokenIn],
                poolState.tokens.map((t) => t.address),
            );
        case JoinKind.Proportional:
            areTokensInArray([input.bptOut.address], [poolState.address]);
        default:
            break;
    }
}
