import { encodeFunctionData } from 'viem';

import { balancerRelayerAbiExtended } from '../../../abi';
import { Address, Hex } from '../../../types';
import { BALANCER_RELAYER, ZERO_ADDRESS } from '../../../utils';

import { Relayer } from '../../relayer';
import { TokenAmount } from '../../tokenAmount';
import { NestedPoolStateV2 } from '../../types';

import { encodeCalls } from './encodeCalls';
import { doRemoveLiquidityNestedQuery } from './doRemoveLiquidityNestedQuery';
import { getPeekCalls } from './getPeekCalls';
import { getQueryCallsAttributes } from './getQueryCallsAttributes';
import { validateQueryInput, validateBuildCallInput } from './validateInputs';
import {
    RemoveLiquidityNestedCallInputV2,
    RemoveLiquidityNestedProportionalInputV2,
    RemoveLiquidityNestedQueryOutputV2,
    RemoveLiquidityNestedSingleTokenInputV2,
} from './types';

export class RemoveLiquidityNestedV2 {
    async query(
        input:
            | RemoveLiquidityNestedProportionalInputV2
            | RemoveLiquidityNestedSingleTokenInputV2,
        nestedPoolState: NestedPoolStateV2,
    ): Promise<RemoveLiquidityNestedQueryOutputV2> {
        const isProportional = validateQueryInput(input, nestedPoolState);
        const { callsAttributes, bptAmountIn } = getQueryCallsAttributes(
            input,
            nestedPoolState.pools,
            isProportional,
        );

        const encodedCalls = encodeCalls(callsAttributes, isProportional);

        const { peekCalls, tokensOut } = getPeekCalls(
            callsAttributes,
            isProportional,
        );

        // insert peek calls to get amountsOut
        let tokensOutCount = 0;
        const tokensOutIndexes: number[] = [];
        callsAttributes.forEach((call, i) => {
            tokensOut.forEach((tokenOut, j) => {
                if (
                    call.sortedTokens.some((t) =>
                        t.isSameAddress(tokenOut.address),
                    )
                ) {
                    tokensOutCount++;
                    encodedCalls.splice(i + tokensOutCount, 0, peekCalls[j]);
                    tokensOutIndexes.push(i + tokensOutCount);
                }
            });
        });

        const encodedMulticall = encodeFunctionData({
            abi: balancerRelayerAbiExtended,
            functionName: 'vaultActionsQueryMulticall',
            args: [encodedCalls],
        });

        const peekedValues = await doRemoveLiquidityNestedQuery(
            input.chainId,
            input.rpcUrl,
            encodedMulticall,
            tokensOutIndexes,
        );

        const amountsOut = tokensOut.map((tokenOut, i) =>
            TokenAmount.fromRawAmount(tokenOut, peekedValues[i]),
        );

        return {
            to: BALANCER_RELAYER[input.chainId],
            protocolVersion: 2,
            callsAttributes,
            bptAmountIn,
            amountsOut,
            isProportional,
            chainId: input.chainId,
        };
    }

    buildCall(input: RemoveLiquidityNestedCallInputV2): {
        callData: Hex;
        to: Address;
        minAmountsOut: TokenAmount[];
    } {
        validateBuildCallInput(input);

        // apply slippage to amountsOut
        const minAmountsOut = input.amountsOut.map((amountOut) =>
            TokenAmount.fromRawAmount(
                amountOut.token,
                input.slippage.applyTo(amountOut.amount, -1),
            ),
        );

        input.callsAttributes.forEach((call) => {
            // update relevant calls with minAmountOut limits in place
            minAmountsOut.forEach((minAmountOut, j) => {
                const minAmountOutIndex = call.sortedTokens.findIndex((t) =>
                    t.isSameAddress(minAmountOut.token.address),
                );
                if (minAmountOutIndex !== -1) {
                    call.minAmountsOut[minAmountOutIndex] =
                        minAmountsOut[j].amount;
                }
            });
            // update wethIsEth flag
            call.wethIsEth = !!input.wethIsEth;
            // update sender and recipient placeholders
            call.sender =
                call.sender === ZERO_ADDRESS
                    ? input.accountAddress
                    : call.sender;
            call.recipient =
                call.recipient === ZERO_ADDRESS
                    ? input.accountAddress
                    : call.recipient;
        });

        const encodedCalls = encodeCalls(
            input.callsAttributes,
            input.isProportional,
        );

        // prepend relayer approval if provided
        if (input.relayerApprovalSignature !== undefined) {
            encodedCalls.unshift(
                Relayer.encodeSetRelayerApproval(
                    BALANCER_RELAYER[input.callsAttributes[0].chainId],
                    true,
                    input.relayerApprovalSignature,
                ),
            );
        }

        const callData = encodeFunctionData({
            abi: balancerRelayerAbiExtended,
            functionName: 'multicall',
            args: [encodedCalls],
        });

        return {
            callData,
            to: BALANCER_RELAYER[input.callsAttributes[0].chainId],
            minAmountsOut,
        };
    }
}
