import { encodeFunctionData } from 'viem';
import { balancerRouterAbi } from '@/abi';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    getAmounts,
    getBptAmountFromReferenceAmount,
    getSortedTokens,
} from '@/entities/utils';
import { Hex } from '@/types';
import {
    BALANCER_ROUTER,
    addLiquiditySingleTokenShouldHaveTokenInIndexError,
} from '@/utils';

import { getAmountsCall } from '../helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseBuildCallInput,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
    AddLiquidityKind,
} from '../types';
import { doAddLiquidityUnbalancedQuery } from './doAddLiquidityUnbalancedQuery';
import { doAddLiquiditySingleTokenQuery } from './doAddLiquiditySingleTokenQuery';
import { doAddLiquidityProportionalQuery } from './doAddLiquidityProportionalQuery';
import { getValue } from '@/entities/utils/getValue';
import { Permit2 } from '@/entities/permit2Helper';

export class AddLiquidityV3 implements AddLiquidityBase {
    async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const bptToken = new Token(input.chainId, poolState.address, 18);

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];
        let tokenInIndex: number | undefined;

        switch (input.kind) {
            case AddLiquidityKind.Proportional: {
                const bptAmount = await getBptAmountFromReferenceAmount(
                    input,
                    poolState,
                );

                // proportional join query returns exactAmountsIn for exactBptOut
                const amountsInNumbers = await doAddLiquidityProportionalQuery(
                    input,
                    poolState.address,
                    bptAmount.rawAmount,
                );

                amountsIn = sortedTokens.map((t, i) =>
                    TokenAmount.fromRawAmount(t, amountsInNumbers[i]),
                );

                bptOut = TokenAmount.fromRawAmount(
                    bptToken,
                    bptAmount.rawAmount,
                );

                tokenInIndex = undefined;
                break;
            }
            case AddLiquidityKind.Unbalanced: {
                const maxAmountsIn = getAmounts(sortedTokens, input.amountsIn);
                const bptAmountOut = await doAddLiquidityUnbalancedQuery(
                    input,
                    poolState.address,
                    maxAmountsIn,
                );
                bptOut = TokenAmount.fromRawAmount(bptToken, bptAmountOut);
                amountsIn = sortedTokens.map((t, i) =>
                    TokenAmount.fromRawAmount(t, maxAmountsIn[i]),
                );
                tokenInIndex = undefined;
                break;
            }
            case AddLiquidityKind.SingleToken: {
                bptOut = TokenAmount.fromRawAmount(
                    bptToken,
                    input.bptOut.rawAmount,
                );
                const amountIn = await doAddLiquiditySingleTokenQuery(
                    input,
                    poolState.address,
                    input.bptOut.rawAmount,
                );
                amountsIn = sortedTokens.map((t) => {
                    if (t.isSameAddress(input.tokenIn))
                        return TokenAmount.fromRawAmount(t, amountIn);

                    return TokenAmount.fromRawAmount(t, 0n);
                });
                tokenInIndex = sortedTokens.findIndex((t) =>
                    t.isSameAddress(input.tokenIn),
                );
                break;
            }
        }

        const output: AddLiquidityBaseQueryOutput = {
            poolType: poolState.type,
            poolId: poolState.id,
            addLiquidityKind: input.kind,
            bptOut,
            amountsIn,
            tokenInIndex,
            chainId: input.chainId,
            protocolVersion: 3,
        };

        return output;
    }

    buildCall(
        input: AddLiquidityBaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);
        let callData: Hex;
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Proportional:
                {
                    callData = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'addLiquidityProportional',
                        args: [
                            input.poolId,
                            amounts.maxAmountsIn,
                            amounts.minimumBpt,
                            !!input.wethIsEth,
                            '0x',
                        ],
                    });
                }
                break;
            case AddLiquidityKind.Unbalanced:
                {
                    callData = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'addLiquidityUnbalanced',
                        args: [
                            input.poolId,
                            input.amountsIn.map((a) => a.amount),
                            amounts.minimumBpt,
                            !!input.wethIsEth,
                            '0x',
                        ],
                    });
                }
                break;
            case AddLiquidityKind.SingleToken:
                {
                    // just a sanity check as this is already checked in InputValidator
                    if (input.tokenInIndex === undefined) {
                        throw addLiquiditySingleTokenShouldHaveTokenInIndexError;
                    }
                    callData = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'addLiquiditySingleTokenExactOut',
                        args: [
                            input.poolId,
                            input.amountsIn[input.tokenInIndex].token.address,
                            input.amountsIn[input.tokenInIndex].amount,
                            input.bptOut.amount,
                            !!input.wethIsEth,
                            '0x',
                        ],
                    });
                }
                break;
        }

        return {
            callData,
            to: BALANCER_ROUTER[input.chainId],
            value: getValue(input.amountsIn, !!input.wethIsEth),
            minBptOut: TokenAmount.fromRawAmount(
                input.bptOut.token,
                amounts.minimumBpt,
            ),
            maxAmountsIn: input.amountsIn.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.maxAmountsIn[i]),
            ),
        };
    }

    public buildCallWithPermit2(
        input: AddLiquidityBaseBuildCallInput,
        permit2: Permit2,
    ): AddLiquidityBuildCallOutput {
        const buildCallOutput = this.buildCall(input);

        const args = [
            [],
            [],
            permit2.batch,
            permit2.signature,
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
