import { encodeFunctionData, zeroAddress } from 'viem';
import { balancerRouterAbiExtended } from '@/abi';
import { Permit2 } from '@/entities/permit2Helper';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    getAmounts,
    getBptAmountFromReferenceAmount,
    getSortedTokens,
    getValue,
} from '@/entities/utils';
import { Hex } from '@/types';
import { balancerV3Contracts, missingParameterError } from '@/utils';

import { getAmountsCall } from '../helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityV3BuildCallInput,
} from '../types';
import { doAddLiquidityUnbalancedQuery } from './doAddLiquidityUnbalancedQuery';
import { doAddLiquiditySingleTokenQuery } from './doAddLiquiditySingleTokenQuery';
import { doAddLiquidityProportionalQuery } from './doAddLiquidityProportionalQuery';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

export class AddLiquidityV3 implements AddLiquidityBase {
    async query(
        input: AddLiquidityInput,
        poolState: PoolState,
        block?: bigint,
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
                    input.rpcUrl,
                    input.chainId,
                    input.sender ?? zeroAddress,
                    input.userData ?? '0x',
                    poolState.address,
                    bptAmount.rawAmount,
                    block,
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
                    input.rpcUrl,
                    input.chainId,
                    input.sender ?? zeroAddress,
                    input.userData ?? '0x',
                    poolState.address,
                    maxAmountsIn,
                    block,
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
                    input.rpcUrl,
                    input.chainId,
                    input.sender ?? zeroAddress,
                    input.userData ?? '0x',
                    input.tokenIn,
                    poolState.address,
                    input.bptOut.rawAmount,
                    block,
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

        const output: AddLiquidityBaseQueryOutput & { userData: Hex } = {
            to: AddressProvider.Router(input.chainId),
            poolType: poolState.type,
            poolId: poolState.id,
            addLiquidityKind: input.kind,
            bptOut,
            amountsIn,
            tokenInIndex,
            chainId: input.chainId,
            protocolVersion: 3,
            userData: input.userData ?? '0x',
        };

        return output;
    }

    buildCall(
        input: AddLiquidityV3BuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);
        let callData: Hex;
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Proportional:
                {
                    callData = encodeFunctionData({
                        abi: balancerRouterAbiExtended,
                        functionName: 'addLiquidityProportional',
                        args: [
                            input.poolId,
                            amounts.maxAmountsIn,
                            amounts.minimumBpt,
                            !!input.wethIsEth,
                            input.userData,
                        ],
                    });
                }
                break;
            case AddLiquidityKind.Unbalanced:
                {
                    callData = encodeFunctionData({
                        abi: balancerRouterAbiExtended,
                        functionName: 'addLiquidityUnbalanced',
                        args: [
                            input.poolId,
                            input.amountsIn.map((a) => a.amount),
                            amounts.minimumBpt,
                            !!input.wethIsEth,
                            input.userData,
                        ],
                    });
                }
                break;
            case AddLiquidityKind.SingleToken:
                {
                    // just a sanity check as this is already checked in InputValidator
                    if (input.tokenInIndex === undefined) {
                        throw missingParameterError(
                            'Add Liquidity SingleToken',
                            'tokenInIndex',
                            input.protocolVersion,
                        );
                    }
                    callData = encodeFunctionData({
                        abi: balancerRouterAbiExtended,
                        functionName: 'addLiquiditySingleTokenExactOut',
                        args: [
                            input.poolId,
                            input.amountsIn[input.tokenInIndex].token.address,
                            input.amountsIn[input.tokenInIndex].amount,
                            input.bptOut.amount,
                            !!input.wethIsEth,
                            input.userData,
                        ],
                    });
                }
                break;
        }

        return {
            callData,
            to: AddressProvider.Router(input.chainId),
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
        input: AddLiquidityV3BuildCallInput,
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
            abi: balancerRouterAbiExtended,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }
}
