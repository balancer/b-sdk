import { encodeFunctionData } from 'viem';
import { Address, Hex } from '../../types';
import { BALANCER_RELAYER } from '../../utils';
import { Relayer } from '../relayer';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi } from '../../abi';
import {
    RemoveLiquidityNestedProportionalInput,
    RemoveLiquidityNestedSingleTokenInput,
    RemoveLiquidityNestedQueryOutput,
    RemoveLiquidityNestedCallInput,
} from './types';
import { NestedPoolState } from '../types';
import { doRemoveLiquidityNestedQuery } from './doRemoveLiquidityNestedQuery';
import { getQueryCallsAttributes } from './getQueryCallsAttributes';
import { encodeCalls } from './encodeCalls';
import { getPeekCalls } from './getPeekCalls';
import { validateInputs } from './validateInputs';

export class RemoveLiquidityNested {
    async query(
        input:
            | RemoveLiquidityNestedProportionalInput
            | RemoveLiquidityNestedSingleTokenInput,
        nestedPoolState: NestedPoolState,
    ): Promise<RemoveLiquidityNestedQueryOutput> {
        const isProportional = validateInputs(input, nestedPoolState);

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

        // append peek calls to get amountsOut
        encodedCalls.push(...peekCalls);

        const encodedMulticall = encodeFunctionData({
            abi: balancerRelayerAbi,
            functionName: 'vaultActionsQueryMulticall',
            args: [encodedCalls],
        });

        const peekedValues = await doRemoveLiquidityNestedQuery(
            input.chainId,
            input.rpcUrl,
            input.accountAddress,
            encodedMulticall,
            tokensOut.length,
        );

        console.log('peekedValues ', peekedValues);

        const amountsOut = tokensOut.map((tokenOut, i) =>
            TokenAmount.fromRawAmount(tokenOut, peekedValues[i]),
        );

        return { callsAttributes, bptAmountIn, amountsOut, isProportional };
    }

    buildCall(input: RemoveLiquidityNestedCallInput): {
        call: Hex;
        to: Address;
        minAmountsOut: TokenAmount[];
    } {
        // apply slippage to amountsOut
        const minAmountsOut = input.amountsOut.map((amountOut) =>
            TokenAmount.fromRawAmount(
                amountOut.token,
                input.slippage.removeFrom(amountOut.amount),
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

        const call = encodeFunctionData({
            abi: balancerRelayerAbi,
            functionName: 'multicall',
            args: [encodedCalls],
        });

        return {
            call,
            to: BALANCER_RELAYER[input.callsAttributes[0].chainId],
            minAmountsOut,
        };
    }
}
