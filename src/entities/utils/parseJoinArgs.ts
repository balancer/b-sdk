import { Address } from '../../types';
import { Token } from '../token';
import { replaceWrapped } from './replaceWrapped';

export function parseJoinArgs({
    joinWithNativeAsset,
    chainId,
    sortedTokens: poolTokens,
    poolId,
    sender,
    recipient,
    maxAmountsIn,
    userData,
}: {
    chainId?: number;
    joinWithNativeAsset?: boolean;
    sortedTokens: Token[];
    poolId: Address;
    sender: Address;
    recipient: Address;
    maxAmountsIn: readonly bigint[];
    userData: Address;
}) {
    // replace wrapped token with native asset if needed
    const tokensIn =
        joinWithNativeAsset && chainId
            ? replaceWrapped([...poolTokens], chainId)
            : [...poolTokens];

    const joinPoolRequest = {
        assets: tokensIn.map((t) => t.address), // with BPT
        maxAmountsIn, // with BPT
        userData, // wihtout BPT
        fromInternalBalance: false, // TODO
    };

    return [poolId, sender, recipient, joinPoolRequest] as const;
}
