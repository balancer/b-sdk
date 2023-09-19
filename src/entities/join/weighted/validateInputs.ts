import { JoinInput, JoinKind } from '..';
import { PoolState } from '../../types';
import { Address } from '../../../types';

export function validateInputs(input: JoinInput, poolState: PoolState) {
    switch (input.kind) {
        case JoinKind.Init:
        case JoinKind.Unbalanced:
            checkTokenMismatch(
                input.amountsIn.map((a) => a.token.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
        case JoinKind.SingleAsset:
            checkTokenMismatch(
                [input.tokenIn],
                poolState.tokens.map((t) => t.address),
            );
        case JoinKind.Proportional:
            checkTokenMismatch(
                [input.bptOut.token.address.toLowerCase() as Address],
                [poolState.address],
            );
        default:
            break;
    }
}

function checkTokenMismatch(tokensIn: Address[], poolTokens: Address[]) {
    for (const tokenIn of tokensIn) {
        if (!poolTokens.includes(tokenIn.toLowerCase() as Address)) {
            throw new Error(`Token ${tokenIn} not found in pool`);
        }
    }
}
