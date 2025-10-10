import { Address, Hex } from '../../types';
import { Token } from '../token';
import { replaceWrapped } from './replaceWrapped';

export function parseAddLiquidityArgs({
    wethIsEth,
    chainId,
    sortedTokens,
    poolId,
    sender,
    recipient,
    maxAmountsIn,
    userData,
    fromInternalBalance,
}: {
    chainId?: number;
    wethIsEth?: boolean;
    sortedTokens: Token[];
    poolId: Hex;
    sender: Address;
    recipient: Address;
    maxAmountsIn: readonly bigint[];
    userData: Hex;
    fromInternalBalance?: boolean;
}) {
    // replace wrapped token with native asset if needed
    const tokensIn =
        chainId && wethIsEth
            ? replaceWrapped([...sortedTokens], chainId)
            : [...sortedTokens];

    const joinPoolRequest = {
        assets: tokensIn.map((t) => t.address), // with BPT
        maxAmountsIn, // with BPT
        userData, // wihtout BPT
        fromInternalBalance: !!fromInternalBalance,
    };

    return {
        args: [poolId, sender, recipient, joinPoolRequest] as const,
        tokensIn,
    };
}
