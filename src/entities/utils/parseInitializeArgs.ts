import { Address } from 'viem';
import { Token } from '../token';
import { InitializeArgs } from '../initPool';
import { DEFAULT_USERDATA } from '@/utils';

export function parseInitializeArgs({
    exactAmountsIn,
    minBptAmountOut,
    wethIsEth,
    poolAddress,
    sortedTokens,
}: {
    exactAmountsIn: bigint[];
    minBptAmountOut: bigint;
    wethIsEth?: boolean;
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
            wethIsEth ?? false,
            DEFAULT_USERDATA,
        ],
    };
}
