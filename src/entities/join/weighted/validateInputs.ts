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
                [input.bptOut.token.address],
                [poolState.address],
            );
        default:
            break;
    }
}

function checkTokenMismatch(tokensIn: Address[], poolTokens: Address[]) {
    const sanitisedTokensIn = tokensIn.map((t) => t.toLowerCase() as Address);
    const sanitisedPoolTokens = poolTokens.map((t) => t.toLowerCase());
    for (const tokenIn of sanitisedTokensIn) {
        if (!sanitisedPoolTokens.includes(tokenIn)) {
            throw new Error(`Token ${tokenIn} not found in pool`);
        }
    }
}
