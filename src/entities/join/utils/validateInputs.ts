import { JoinInput, JoinKind } from '../types';
import { PoolStateInput } from '../../types';
import { areTokensInArray } from '../../utils/areTokensInArray';
import { Address } from 'viem';
import { MinimalToken } from '../../../data';

export function validateInputs(input: JoinInput, poolState: PoolStateInput) {
    validateComposableStableWithoutBPT(
        poolState.type,
        poolState.address,
        poolState.tokens,
    );
    validateGyroPoolJoinIsNotProportional(input.kind, poolState.type);
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

export const gyroJoinKindNotSupported = 'INPUT_ERROR: Gyro pools do not implement this join kind, only Proportional Joins(3 - ALL_TOKENS_IN_FOR_BPT_OUT) are supported'

function validateGyroPoolJoinIsNotProportional(
    kind: JoinKind,
    poolType: string,
) {
    if (
        ['GYROE', 'GYRO2', 'GYRO3'].includes(poolType) &&
        kind !== JoinKind.Proportional
    ) {
        throw new Error(gyroJoinKindNotSupported);
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
