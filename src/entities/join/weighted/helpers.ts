import { Address } from '../../../types';
import { ZERO_ADDRESS } from '../../../utils';
import { WeightedEncoder } from '../../encoders';
import { TokenAmount } from '../../tokenAmount';
import { JoinInput, JoinKind, PoolState } from '..';

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
export function getAmountsIn(input: JoinInput, poolAssets: string[]): bigint[] {
    return poolAssets.map((asset) => {
        let tokenIn: TokenAmount | undefined;
        switch (input.kind) {
            case JoinKind.Init:
                tokenIn = input.initAmountsIn.find(
                    (t) => t.token.wrapped === asset,
                );
                break;
            case JoinKind.Proportional:
                if (input.refAmountIn.token.wrapped === asset)
                    tokenIn = input.refAmountIn;
                // TODO: calculate proportional amounts based on reference token
                break;
            case JoinKind.Unbalanced:
                tokenIn = input.amountsIn.find(
                    (t) => t.token.wrapped === asset,
                );
                break;
            case JoinKind.SingleAsset:
                if (input.amountIn.token.wrapped === asset)
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

export function getAssets(input: JoinInput, poolAssets: Address[]): Address[] {
    let nativeTokenIn: TokenAmount | undefined;
    switch (input.kind) {
        case JoinKind.Init:
            nativeTokenIn = input.initAmountsIn.find(
                (t) => t.token.address === ZERO_ADDRESS,
            );
            break;
        case JoinKind.Proportional:
            if (input.refAmountIn.token.address === ZERO_ADDRESS)
                nativeTokenIn = input.refAmountIn;
            break;
        case JoinKind.Unbalanced:
            nativeTokenIn = input.amountsIn.find(
                (t) => t.token.address === ZERO_ADDRESS,
            );
            break;
        case JoinKind.SingleAsset:
            if (input.amountIn.token.address === ZERO_ADDRESS)
                nativeTokenIn = input.amountIn;
            break;
    }
    let assets = [...poolAssets];

    if (nativeTokenIn !== undefined) {
        const wrappedAssetIndex = poolAssets.findIndex(
            // TODO: this assumes that the user provided wrapped address for input tokens - is that a fair assumption?
            (a) => a === (nativeTokenIn as TokenAmount).token.wrapped,
        );
        assets = [
            ...poolAssets.slice(0, wrappedAssetIndex),
            ZERO_ADDRESS,
            ...poolAssets.slice(wrappedAssetIndex + 1, poolAssets.length),
        ];
    }
    return assets;
}
