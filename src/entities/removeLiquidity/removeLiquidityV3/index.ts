import { createPublicClient, encodeFunctionData, http } from 'viem';

import { balancerRouterAbi } from '@/abi';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import { getSortedTokens } from '@/entities/utils';
import { Hex } from '@/types';
import {
    BALANCER_ROUTER,
    CHAINS,
    removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError,
    removeLiquidityUnbalancedNotSupportedOnV3,
} from '@/utils';

import { getAmountsCall, getAmountsQuery } from '../helper';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBaseCall,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
} from '../types';

export class RemoveLiquidityV3 implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = getAmountsQuery(sortedTokens, input);

        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        let maxBptAmountIn: bigint;
        let minAmountsOut: readonly bigint[];

        switch (input.kind) {
            case RemoveLiquidityKind.Unbalanced:
                throw removeLiquidityUnbalancedNotSupportedOnV3;
            case RemoveLiquidityKind.SingleTokenExactOut:
                {
                    minAmountsOut = amounts.minAmountsOut;
                    ({ result: maxBptAmountIn } = await client.simulateContract(
                        {
                            address: BALANCER_ROUTER[input.chainId],
                            abi: balancerRouterAbi,
                            functionName:
                                'queryRemoveLiquiditySingleTokenExactOut',
                            args: [
                                poolState.address,
                                amounts.maxBptAmountIn,
                                input.amountOut.address,
                                input.amountOut.rawAmount,
                                '0x',
                            ],
                        },
                    ));
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    ({ result: minAmountsOut } = await client.simulateContract({
                        address: BALANCER_ROUTER[input.chainId],
                        abi: balancerRouterAbi,
                        functionName: 'queryRemoveLiquiditySingleTokenExactIn',
                        args: [
                            poolState.address,
                            amounts.maxBptAmountIn,
                            input.tokenOut,
                            amounts.minAmountsOut[
                                sortedTokens.findIndex((t) =>
                                    t.isSameAddress(input.tokenOut),
                                )
                            ],
                            '0x',
                        ],
                    }));
                }
                break;
            case RemoveLiquidityKind.Proportional:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    ({ result: minAmountsOut } = await client.simulateContract({
                        address: BALANCER_ROUTER[input.chainId],
                        abi: balancerRouterAbi,
                        functionName: 'queryRemoveLiquidityProportional',
                        args: [
                            poolState.address,
                            input.bptIn.rawAmount,
                            amounts.minAmountsOut,
                            '0x',
                        ],
                    }));
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
            toInternalBalance: !!input.toInternalBalance,
            balancerVersion: poolState.balancerVersion,
        };

        return output;
    }

    public buildCall(
        input: RemoveLiquidityBaseCall,
    ): RemoveLiquidityBuildOutput {
        const amounts = getAmountsCall(input);

        let call: Hex;
        switch (input.removeLiquidityKind) {
            case RemoveLiquidityKind.Unbalanced:
                throw removeLiquidityUnbalancedNotSupportedOnV3;
            case RemoveLiquidityKind.SingleTokenExactOut:
                {
                    // just a sanity check as this is already checked in InputValidator
                    if (input.tokenOutIndex === undefined) {
                        throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;
                    }
                    call = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'removeLiquiditySingleTokenExactOut',
                        args: [
                            input.poolId,
                            input.bptIn.amount,
                            input.amountsOut[input.tokenOutIndex].token.address,
                            input.amountsOut[input.tokenOutIndex].amount,
                            input.wethIsEth,
                            '0x',
                        ],
                    });
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    // just a sanity check as this is already checked in InputValidator
                    if (input.tokenOutIndex === undefined) {
                        throw new Error(
                            'RemoveLiquidityKind.SingleTokenExactOut should have tokenOutIndex',
                        );
                    }
                    call = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'removeLiquiditySingleTokenExactIn',
                        args: [
                            input.poolId,
                            input.bptIn.amount,
                            input.amountsOut[input.tokenOutIndex].token.address,
                            amounts.minAmountsOut[input.tokenOutIndex],
                            input.wethIsEth,
                            '0x',
                        ],
                    });
                }
                break;
            case RemoveLiquidityKind.Proportional:
                {
                    call = encodeFunctionData({
                        abi: balancerRouterAbi,
                        functionName: 'removeLiquidityProportional',
                        args: [
                            input.poolId,
                            input.bptIn.amount,
                            amounts.minAmountsOut,
                            input.wethIsEth,
                            '0x',
                        ],
                    });
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
