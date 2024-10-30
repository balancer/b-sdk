import { Token } from '@/entities';

export const assertTokenMatch = (
    tokenDefined: Token[],
    tokenReturned: Token[],
) => {
    tokenDefined.forEach((t) => console.log(t.address));
    tokenReturned.forEach((t) => console.log(t.address));
    tokenDefined.map((tokenAmount) => {
        expect(
            tokenReturned.some(
                (token) => token.address === tokenAmount.address,
            ),
        ).to.be.true;
    });
    tokenDefined.map((a, i) => {
        expect(a.decimals).to.eq(tokenReturned[i].decimals);
    });
};
