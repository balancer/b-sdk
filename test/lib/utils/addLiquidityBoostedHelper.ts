import { Token } from '@/entities';

export const assertTokenMatch = (
    tokenDefined: Token[],
    tokenReturned: Token[],
) => {
    tokenDefined.map((tokenAmount) => {
        expect(
            tokenReturned.some(
                (token) => token.address === tokenAmount.address,
            ),
        );
    });
    tokenDefined.map((a, i) => {
        expect(a.decimals).to.eq(tokenReturned[i].decimals);
    });
};
