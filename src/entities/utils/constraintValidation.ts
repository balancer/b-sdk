import { NestedPoolState } from '../types';

export function constraintValidation(
    nestedPoolState: NestedPoolState,
): boolean {
    /*
    General rules:
      * Can only add/remove liquidity with the main tokens
      * Main tokens only supported to a max of 1 level of nesting
      * Can still pure add liquidity with > 1 level 
      * A main token can't be a token in > 1 pool

    We can only do minimal validation without introducing complexity/data overhead that the API should be handling. 
    e.g. We can't validate pool state without constructing it which would require more complexity and data.
    So we assume pool state is correct. 
    */
    // pools may not be in order so find highest level which will be top pool
    const topLevel = Math.max(...nestedPoolState.pools.map((p) => p.level));

    nestedPoolState.mainTokens.forEach((t) => {
        const poolsWithToken = nestedPoolState.pools.filter((p) =>
            p.tokens.some((pt) => pt.address === t.address),
        );

        if (poolsWithToken.length < 1)
            throw 'NestedPoolState, main token must exist as a token of a pool';

        if (poolsWithToken.length > 1)
            throw `NestedPoolState, main token can't be token of more than 1 pool`;

        if (poolsWithToken[0]) {
            if (topLevel - poolsWithToken[0].level > 1)
                throw 'NestedPoolState, main token only supported to a max of 1 level of nesting';
        }
    });
    return true;
}
