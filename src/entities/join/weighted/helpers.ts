import { Address } from '../../../types';
import { ZERO_ADDRESS } from '../../../utils';
import { WeightedEncoder } from '../../encoders';
import { TokenAmount } from '../../tokenAmount';
import { JoinInput, JoinKind, PoolState } from '..';
import { Token } from '../../token';

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
    const poolAssets = poolState.tokens.map((t) => t.address);
    switch (input.kind) {
        case JoinKind.Proportional: {
            if (!poolAssets.includes(input.refAmountIn.token.address)) {
                throw new Error('Reference token not in pool');
            }
        }
        break;
        // TODO: think about a way to consolidate checks so this doesn't become uneccessarily hard to maintain
        default:
            break;
    }
}

// TODO: amounts for native asset join relies on the fact that the user provided wrapped address for input tokens - is that a fair assumption?
export function getAmountsIn(input: JoinInput, poolTokens: Token[]): bigint[] {
    return poolTokens.map((token) => {
        let tokenIn: TokenAmount | undefined;
        switch (input.kind) {
            case JoinKind.Init:
                tokenIn = input.initAmountsIn.find((t) =>
                    t.token.isEqual(token),
                );
                break;
            case JoinKind.Proportional:
                if (input.refAmountIn.token.isEqual(token))
                    tokenIn = input.refAmountIn;
                // TODO: calculate proportional amounts based on reference token
                break;
            case JoinKind.Unbalanced:
                tokenIn = input.amountsIn.find((t) => t.token.isEqual(token));
                break;
            case JoinKind.SingleAsset:
                if (input.amountIn.token.isEqual(token))
                    tokenIn = input.amountIn;
                break;
        }
        return tokenIn?.amount ?? 0n;
    });
}

export function getUserData(input: JoinInput, amountsIn: bigint[]): Address {
    let userData: Address;
    switch (input.kind) {
        case JoinKind.Init: {
            userData = WeightedEncoder.joinInit(amountsIn);
            break;
        }
        case JoinKind.Proportional:
        case JoinKind.Unbalanced:
        case JoinKind.SingleAsset: {
            userData = WeightedEncoder.joinGivenIn(amountsIn, 0n);
            break;
        }
        case JoinKind.ExactOut: {
            userData = WeightedEncoder.joinGivenOut(input.bptOut.amount);
            break;
        }
        default:
            throw new Error('Invalid join kind');
    }
    return userData;
}
