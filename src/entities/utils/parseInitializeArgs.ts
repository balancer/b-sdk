import { InputAmount } from '@/types';
import { Address } from 'viem';
import { Token } from '../token';
import { InitializeArgs } from '../initPool';
import { DEFAULT_USERDATA } from '@/utils';

export function parseInitializeArgs({
    exactAmountsIn,
    minBptAmountOut,
    useNativeAssetAsWrappedAmountIn,
    poolAddress,
    sortedTokens,
}: {
    exactAmountsIn: bigint[];
    minBptAmountOut: bigint;
    useNativeAssetAsWrappedAmountIn?: boolean;
    chainId: number;
    poolAddress: Address;
    sortedTokens: Token[];
}): { args: InitializeArgs } {
    return {
        args: [
            poolAddress,
            sortedTokens.map(({ address }) => address),
            exactAmountsIn,
            minBptAmountOut,
            useNativeAssetAsWrappedAmountIn ?? false,
            DEFAULT_USERDATA,
        ],
    };
}
