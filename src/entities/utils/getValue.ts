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
                a.token.isSameAddress(NATIVE_ASSETS[a.token.chainId].wrapped),
            )?.amount ?? 0n;
    }
    return value;
};
