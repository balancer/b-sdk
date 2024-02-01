import {
    PoolState,
    RemoveLiquidityBase,
    RemoveLiquidityBaseCall,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    Token,
    TokenAmount,
    getSortedTokens,
} from '@/entities';
import { createPublicClient, encodeFunctionData, http } from 'viem';
import {
    BALANCER_ROUTER,
    CHAINS,
    removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError,
} from '@/utils';
import { balancerRouterAbi } from '@/abi';
import { Hex } from '@/types';
import { getAmountsCall } from '../helper';

export class RemoveLiquidityV3 implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const bptToken = new Token(input.chainId, poolState.address, 18);

        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        let bptIn: TokenAmount;
        let amountsOut: TokenAmount[];
        let tokenOutIndex: number | undefined;

        switch (input.kind) {
            case RemoveLiquidityKind.Proportional:
                {
                    bptIn = TokenAmount.fromRawAmount(
                        bptToken,
                        input.bptIn.rawAmount,
                    );

                    const { result: minAmountsOut } =
                        await client.simulateContract({
                            address: BALANCER_ROUTER[input.chainId],
                            abi: balancerRouterAbi,
                            functionName: 'queryRemoveLiquidityProportional',
                            args: [
                                poolState.address,
                                input.bptIn.rawAmount,
                                Array(sortedTokens.length).fill(1n), // minAmountsOut set to 0 when querying
                                '0x',
                            ],
                        });
                    amountsOut = sortedTokens.map((t, i) =>
                        TokenAmount.fromRawAmount(t, minAmountsOut[i]),
                    );
                    tokenOutIndex = undefined;
                }
                break;
            case RemoveLiquidityKind.Unbalanced:
                throw new Error(
                    'Unbalanced remove liquidity not supported on V3',
                );
            case RemoveLiquidityKind.SingleToken:
                {
                    bptIn = TokenAmount.fromRawAmount(
                        bptToken,
                        input.bptIn.rawAmount,
                    );

                    const { result: minAmountsOut } =
                        await client.simulateContract({
                            address: BALANCER_ROUTER[input.chainId],
                            abi: balancerRouterAbi,
                            functionName:
                                'queryRemoveLiquiditySingleTokenExactIn',
                            args: [
                                poolState.address,
                                input.bptIn.rawAmount,
                                input.tokenOut,
                                1n, // minAmountOut set to 0 when querying - SC needs it to be > 0 for now - suggested they fix this
                                '0x',
                            ],
                        });

                    amountsOut = sortedTokens.map((t, i) =>
                        TokenAmount.fromRawAmount(t, minAmountsOut[i]),
                    );
                    tokenOutIndex = sortedTokens.findIndex((t) =>
                        t.isSameAddress(input.tokenOut),
                    );
                }
                break;
            // TODO: case for remove liquidity single token exact out
        }

        const output: RemoveLiquidityBaseQueryOutput = {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex,
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
            case RemoveLiquidityKind.Unbalanced:
                throw new Error(
                    'Unbalanced remove liquidity not supported on V3',
                );
            case RemoveLiquidityKind.SingleToken:
                {
                    // just a sanity check as this is already checked in InputValidator
                    if (input.tokenOutIndex === undefined) {
                        throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;
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
