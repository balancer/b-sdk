import { NATIVE_ASSETS } from '@/utils';
import { TokenAmount } from '../tokenAmount';

export const getValue = (
    amountsIn: TokenAmount[],
    wethIsEth: boolean,
): bigint => {
    let value = 0n;
    if (wethIsEth) {
        value =
            amountsIn.find((a) =>
                NATIVE_ASSETS[a.token.chainId].isWrapped(a.token),
            )?.amount ?? 0n;
    }
    return value;
};
