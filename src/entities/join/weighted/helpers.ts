import { Address } from '../../../types';
import { WeightedEncoder } from '../../encoders';
import { TokenAmount } from '../../tokenAmount';
import { JoinInput, JoinKind } from '..';
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
            case JoinKind.ExactIn:
                tokenIn = input.amountsIn.find((t) => t.token.isEqual(token));
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
        case JoinKind.ExactIn: {
            userData = WeightedEncoder.joinGivenIn(amountsIn, 0n);
            break;
        }
        case JoinKind.ExactOutSingleAsset:
        // TODO: add tokenInIndex after refactoring into switch/case into separate functions
        case JoinKind.ExactOutProportional: {
            userData = WeightedEncoder.joinGivenOut(input.bptOut.amount);
            break;
        }
        default:
            throw new Error('Invalid join kind');
    }
    return userData;
}
