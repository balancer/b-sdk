import { ExitInput, ExitKind } from '../types';
import { PoolStateInput } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';
import { Address } from 'viem';
import { MinimalToken } from '../../../data';

export function validateInputs(input: ExitInput, poolState: PoolStateInput) {
    validateComposableStableWithoutBPT(
        poolState.type,
        poolState.address,
        poolState.tokens,
    );
    validateGyroPoolJoinIsNotProportional(input.kind, poolState.type);
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


export const gyroExitKindNotSupported = 'INPUT_ERROR: Gyro pools do not implement this exit kind, only Proportional Exits(1 - EXACT_BPT_IN_FOR_TOKENS_OUT) are supported';

function validateGyroPoolJoinIsNotProportional(
    kind: ExitKind,
    poolType: string,
) {
    if (
        ['GYROE', 'GYRO2', 'GYRO3'].includes(poolType) &&
        kind !== ExitKind.Proportional
    ) {
        throw new Error(gyroExitKindNotSupported);
    }
}

function validateComposableStableWithoutBPT(
    poolType: string,
    poolAddress: Address,
    poolTokens: MinimalToken[],
) {
    const bptIndex = poolTokens.findIndex((t) => t.address === poolAddress);
    if (['PHANTOM_STABLE'].includes(poolType) && bptIndex < 0) {
        throw new Error(
            'INPUT_ERROR: Composable Stable Pool State without BPT token included',
        );
    }
}
