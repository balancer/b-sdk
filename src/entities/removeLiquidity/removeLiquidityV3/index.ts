import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import { getSortedTokens } from '@/entities/utils';
import { Hex } from '@/types';
import {
    BALANCER_ROUTER,
    removeLiquidityUnbalancedNotSupportedOnV3,
} from '@/utils';

import { getAmountsCall, getAmountsQuery } from '../helper';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../types';
import { doRemoveLiquiditySingleTokenExactOutQuery } from './doRemoveLiquiditySingleTokenExactOutQuery';
import { doRemoveLiquiditySingleTokenExactInQuery } from './doRemoveLiquiditySingleTokenExactInQuery';
import { doRemoveLiquidityProportionalQuery } from './doRemoveLiquidityProportionalQuery';
import { encodeRemoveLiquiditySingleTokenExactOut } from './encodeRemoveLiquiditySingleTokenExactOut';
import { encodeRemoveLiquiditySingleTokenExactIn } from './encodeRemoveLiquiditySingleTokenExactIn';
import { encodeRemoveLiquidityProportional } from './encodeRemoveLiquidityProportional';

export class RemoveLiquidityV3 implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = getAmountsQuery(sortedTokens, input);

        let maxBptAmountIn: bigint;
        let minAmountsOut: readonly bigint[];

        switch (input.kind) {
            case RemoveLiquidityKind.Unbalanced:
                throw removeLiquidityUnbalancedNotSupportedOnV3;
            case RemoveLiquidityKind.SingleTokenExactOut:
                {
                    maxBptAmountIn =
                        await doRemoveLiquiditySingleTokenExactOutQuery(
                            input,
                            poolState.address,
                        );
                    minAmountsOut = amounts.minAmountsOut;
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    const minAmountOut =
                        await doRemoveLiquiditySingleTokenExactInQuery(
                            input,
                            poolState.address,
                        );
                    minAmountsOut = sortedTokens.map((t) => {
                        return t.isSameAddress(input.tokenOut)
                            ? minAmountOut
                            : 0n;
                    });
                }
                break;
            case RemoveLiquidityKind.Proportional:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    minAmountsOut = await doRemoveLiquidityProportionalQuery(
                        input,
                        poolState.address,
                    );
                }
                break;
            case RemoveLiquidityKind.Recovery:
                throw new Error(
                    'Pending smart contract implementation and Router ABI update',
                );
        }

        const bptToken = new Token(input.chainId, poolState.address, 18);

        const output: RemoveLiquidityBaseQueryOutput = {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn: TokenAmount.fromRawAmount(bptToken, maxBptAmountIn),
            amountsOut: sortedTokens.map((t, i) =>
                TokenAmount.fromRawAmount(t, minAmountsOut[i]),
            ),
            tokenOutIndex: amounts.tokenOutIndex,
            vaultVersion: poolState.vaultVersion,
            chainId: input.chainId,
        };

        return output;
    }

    public buildCall(
        input: RemoveLiquidityBaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);

        let call: Hex;
        switch (input.removeLiquidityKind) {
            case RemoveLiquidityKind.Unbalanced:
                throw removeLiquidityUnbalancedNotSupportedOnV3;
            case RemoveLiquidityKind.SingleTokenExactOut:
                {
                    call = encodeRemoveLiquiditySingleTokenExactOut(
                        input,
                        amounts.maxBptAmountIn,
                    );
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    call = encodeRemoveLiquiditySingleTokenExactIn(
                        input,
                        amounts.minAmountsOut,
                    );
                }
                break;
            case RemoveLiquidityKind.Proportional:
                {
                    call = encodeRemoveLiquidityProportional(
                        input,
                        amounts.minAmountsOut,
                    );
                }
                break;
            case RemoveLiquidityKind.Recovery:
                throw new Error(
                    'Pending smart contract implementation and Router ABI update',
                );
        }

        return {
            call,
            to: BALANCER_ROUTER[input.chainId],
            value: 0n, // remove liquidity always has value = 0
            maxBptIn: TokenAmount.fromRawAmount(
                input.bptIn.token,
                amounts.maxBptAmountIn,
            ),
            minAmountsOut: input.amountsOut.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.minAmountsOut[i]),
            ),
        };
    }
}
