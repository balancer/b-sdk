import { JoinInput, JoinKind, PoolState } from '..';
import { Address } from '../../../types';

export function getJoinParameters({
    poolId,
    assets,
    sender,
    recipient,
    maxAmountsIn,
    userData,
}: {
    poolId: Address;
    assets: readonly Address[];
    sender: Address;
    recipient: Address;
    maxAmountsIn: readonly bigint[];
    userData: Address;
}) {
    const joinPoolRequest = {
        assets, // with BPT
        maxAmountsIn, // with BPT
        userData, // wihtout BPT
        fromInternalBalance: false,
    };

    return [poolId, sender, recipient, joinPoolRequest] as const;
}

export function checkInputs(input: JoinInput, poolState: PoolState) {
    switch (input.kind) {
        case JoinKind.Init:
            checkTokenMismatch(
                input.initAmountsIn.map((a) => a.token.address),
                poolState.tokens.map((t) => t.address),
            );
            break;
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
