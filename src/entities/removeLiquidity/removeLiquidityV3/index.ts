import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    calculateProportionalAmounts,
    getPoolStateWithBalancesV3,
    getSortedTokens,
} from '@/entities/utils';
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
    RemoveLiquidityRecoveryInput,
} from '../types';
import { doRemoveLiquiditySingleTokenExactOutQuery } from './doRemoveLiquiditySingleTokenExactOutQuery';
import { doRemoveLiquiditySingleTokenExactInQuery } from './doRemoveLiquiditySingleTokenExactInQuery';
import { doRemoveLiquidityProportionalQuery } from './doRemoveLiquidityProportionalQuery';
import { doRemoveLiquidityRecoveryQuery } from './doRemoveLiquidityRecoveryQuery';
import { encodeRemoveLiquiditySingleTokenExactOut } from './encodeRemoveLiquiditySingleTokenExactOut';
import { encodeRemoveLiquiditySingleTokenExactIn } from './encodeRemoveLiquiditySingleTokenExactIn';
import { encodeRemoveLiquidityProportional } from './encodeRemoveLiquidityProportional';
import { encodeRemoveLiquidityRecovery } from './encodeRemoveLiquidityRecovery';
import { encodeFunctionData, zeroAddress } from 'viem';
import { balancerRouterAbi } from '@/abi';
import { Permit } from '@/entities/permitHelper';

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
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    minAmountsOut = await doRemoveLiquidityRecoveryQuery(
                        input,
                        poolState.address,
                    );
                }
                break;
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
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
        };

        return output;
    }

    /**
     * It's not possible to query Remove Liquidity Recovery in the same way as
     * other remove liquidity kinds, but since it's not affected by fees or anything
     * other than pool balances, we can calculate amountsOut as proportional amounts.
     */
    public async queryRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const poolStateWithBalances = await getPoolStateWithBalancesV3(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { tokenAmounts } = calculateProportionalAmounts(
            poolStateWithBalances,
            input.bptIn,
        );

        const bptIn = TokenAmount.fromRawAmount(
            new Token(input.chainId, input.bptIn.address, input.bptIn.decimals),
            input.bptIn.rawAmount,
        );
        const amountsOut = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new Token(input.chainId, amountIn.address, amountIn.decimals),
                amountIn.rawAmount,
            ),
        );
        return {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: undefined,
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
        };
    }

    public buildCall(
        input: RemoveLiquidityBaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);

        let callData: Hex;
        switch (input.removeLiquidityKind) {
            case RemoveLiquidityKind.Unbalanced:
                throw removeLiquidityUnbalancedNotSupportedOnV3;
            case RemoveLiquidityKind.SingleTokenExactOut:
                {
                    callData = encodeRemoveLiquiditySingleTokenExactOut(
                        input,
                        amounts.maxBptAmountIn,
                    );
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    callData = encodeRemoveLiquiditySingleTokenExactIn(
                        input,
                        amounts.minAmountsOut,
                    );
                }
                break;
            case RemoveLiquidityKind.Proportional:
                {
                    callData = encodeRemoveLiquidityProportional(
                        input,
                        amounts.minAmountsOut,
                    );
                }
                break;
            case RemoveLiquidityKind.Recovery:
                {
                    callData = encodeRemoveLiquidityRecovery(input);
                }
                break;
        }

        return {
            callData,
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

    public buildCallWithPermit(
        input: RemoveLiquidityBaseBuildCallInput,
        permit: Permit,
    ): RemoveLiquidityBuildCallOutput {
        const buildCallOutput = this.buildCall(input);

        const args = [
            permit.batch,
            permit.signatures,
            { details: [], spender: zeroAddress, sigDeadline: 0n },
            '0x',
            [buildCallOutput.callData],
        ] as const;

        const callData = encodeFunctionData({
            abi: balancerRouterAbi,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }
}
