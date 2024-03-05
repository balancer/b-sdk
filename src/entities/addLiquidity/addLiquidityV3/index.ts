import { encodeFunctionData } from 'viem';
import { balancerRouterAbi } from '@/abi';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import { getAmounts, getSortedTokens } from '@/entities/utils';
import { Hex } from '@/types';
import {
    BALANCER_ROUTER,
    NATIVE_ASSETS,
    addLiquidityProportionalUnavailableError,
    addLiquiditySingleTokenShouldHaveTokenInIndexError,
} from '@/utils';

import { getAmountsCall } from '../helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseCall,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityKind,
} from '../types';
import { doAddLiquidityUnbalancedQuery } from './doAddLiquidityUnbalancedQuery';
import { doAddLiquiditySingleTokenQuery } from './doAddLiquiditySingleTokenQuery';

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
            case AddLiquidityKind.Proportional:
                throw addLiquidityProportionalUnavailableError;
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
                const maxAmountsIn = await doAddLiquiditySingleTokenQuery(
                    input,
                    poolState.address,
                    input.bptOut.rawAmount,
                );
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
            vaultVersion: 3,
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
                            !!input.sendNativeAsset,
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
                            !!input.sendNativeAsset,
                            '0x',
                        ],
                    });
                }
                break;
        }

        let value = 0n;
        if (input.sendNativeAsset) {
            const wrappedNativeAssetInput = input.amountsIn.find(
                (a) => a.token.address === NATIVE_ASSETS[input.chainId].wrapped,
            );
            if (wrappedNativeAssetInput === undefined) {
                throw new Error(
                    'sendNativeAsset requires wrapped native asset as input',
                );
            }
            value = wrappedNativeAssetInput.amount;
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
