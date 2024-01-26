import { createPublicClient, encodeFunctionData, http } from 'viem';
import { balancerRouterAbi } from '@/abi';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import { getAmounts, getSortedTokens } from '@/entities/utils';
import { Hex } from '@/types';
import {
    BALANCER_ROUTER,
    CHAINS,
    MAX_UINT112,
    NATIVE_ASSETS,
    addLiquidityProportionalUnavailableError,
    addLiquiditySingleTokenShouldHaveTokenInIndexError,
} from '@/utils';

import { getAmountsCall } from './helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseCall,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityKind,
} from './types';

export class AddLiquidityV3 implements AddLiquidityBase {
    async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const bptToken = new Token(input.chainId, poolState.address, 18);

        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];
        let tokenInIndex: number | undefined;

        switch (input.kind) {
            case AddLiquidityKind.Proportional:
                throw addLiquidityProportionalUnavailableError;
            case AddLiquidityKind.Unbalanced: {
                const maxAmountsIn = getAmounts(sortedTokens, input.amountsIn);
                const { result: bptAmountOut } = await client.simulateContract({
                    address: BALANCER_ROUTER[input.chainId],
                    abi: balancerRouterAbi,
                    functionName: 'queryAddLiquidityUnbalanced',
                    args: [
                        poolState.address,
                        maxAmountsIn,
                        0n, // minBptOut set to 0 when querying
                        '0x',
                    ],
                });
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
                const { result: maxAmountsIn } = await client.simulateContract({
                    address: BALANCER_ROUTER[input.chainId],
                    abi: balancerRouterAbi,
                    functionName: 'queryAddLiquiditySingleTokenExactOut',
                    args: [
                        poolState.address,
                        input.tokenIn,
                        MAX_UINT112, // maxAmountIn set to max value when querying
                        bptOut.amount,
                        '0x',
                    ],
                });
                amountsIn = sortedTokens.map((t, i) =>
                    TokenAmount.fromRawAmount(t, maxAmountsIn[i]),
                );
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
            fromInternalBalance: input.fromInternalBalance ?? false,
            balancerVersion: 3,
            tokenInIndex,
        };

        return output;
    }

    buildCall(input: AddLiquidityBaseCall): AddLiquidityBuildOutput {
        const amounts = getAmountsCall(input);
        let call: Hex;
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Proportional:
                throw addLiquidityProportionalUnavailableError;
            case AddLiquidityKind.Unbalanced:
                {
                    call = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'addLiquidityUnbalanced',
                        args: [
                            input.poolId,
                            input.amountsIn.map((a) => a.amount),
                            amounts.minimumBpt,
                            input.wethIsEth,
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
                    call = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'addLiquiditySingleTokenExactOut',
                        args: [
                            input.poolId,
                            input.amountsIn[input.tokenInIndex].token.address,
                            input.amountsIn[input.tokenInIndex].amount,
                            input.bptOut.amount,
                            input.wethIsEth,
                            '0x',
                        ],
                    });
                }
                break;
        }

        let value = 0n;
        if (input.wethIsEth) {
            const wethInput = input.amountsIn.find(
                (a) => a.token.address === NATIVE_ASSETS[input.chainId].wrapped,
            );
            value = wethInput?.amount ?? 0n;
        }

        return {
            call,
            to: BALANCER_ROUTER[input.chainId],
            value,
            minBptOut: TokenAmount.fromRawAmount(
                input.bptOut.token,
                amounts.minimumBpt,
            ),
            maxAmountsIn: input.amountsIn.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.maxAmountsIn[i]),
            ),
        };
    }
}
