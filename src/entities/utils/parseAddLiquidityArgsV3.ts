import { Address, Hex } from '../../types';
import { Token } from '../token';
import { replaceWrapped } from './replaceWrapped';

export function parseAddLiquidityArgsV3({
    useNativeAssetAsWrappedAmountIn,
    chainId,
    sortedTokens,
    poolAddress,
    sender,
    recipient,
    maxAmountsIn,
}: {
    chainId?: number;
    useNativeAssetAsWrappedAmountIn?: boolean;
    sortedTokens: Token[];
    poolAddress: Hex;
    sender: Address;
    recipient: Address;
    maxAmountsIn: readonly bigint[];
}) {
    // TODO - Update properly for V3
    // replace wrapped token with native asset if needed
    const tokensIn =
        chainId && useNativeAssetAsWrappedAmountIn
            ? replaceWrapped([...sortedTokens], chainId)
            : [...sortedTokens];

    const joinPoolRequest = {
        assets: tokensIn.map((t) => t.address), // with BPT
        maxAmountsIn, // with BPT
    };

    return {
        args: [poolAddress, sender, recipient, joinPoolRequest] as const,
        tokensIn,
    };
}
