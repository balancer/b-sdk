import { AddLiquidity, AddLiquiditySingleTokenInput } from '../addLiquidity';
import { PriceImpactAmount } from '../priceImpactAmount';
import {
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../removeLiquidity';
import { PoolStateInput } from '../types';
import { getSortedTokens } from '../utils';

export class PriceImpact {
    static addLiquiditySingleToken = async (
        input: AddLiquiditySingleTokenInput,
        poolState: PoolStateInput,
    ): Promise<PriceImpactAmount> => {
        // inputs are being validated within AddLiquidity

        // simulate adding liquidity to get amounts in
        const addLiquidity = new AddLiquidity();
        const { amountsIn } = await addLiquidity.query(input, poolState);

        // simulate removing liquidity to get amounts out
        const removeLiquidity = new RemoveLiquidity();
        const removeLiquidityInput: RemoveLiquidityInput = {
            chainId: input.chainId,
            rpcUrl: input.rpcUrl,
            bptIn: input.bptOut,
            tokenOut: input.tokenIn,
            kind: RemoveLiquidityKind.SingleToken,
        };
        const { amountsOut } = await removeLiquidity.query(
            removeLiquidityInput,
            poolState,
        );

        // get relevant amounts for price impact calculation
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const tokenIndex = sortedTokens.findIndex((t) =>
            t.isSameAddress(input.tokenIn),
        );
        const amountInitial = parseFloat(amountsIn[tokenIndex].toSignificant());
        const amountFinal = parseFloat(amountsOut[tokenIndex].toSignificant());

        // calculate price impact using ABA method
        const priceImpact = (amountInitial - amountFinal) / amountInitial / 2;
        return PriceImpactAmount.fromDecimal(`${priceImpact}`);
    };
}
