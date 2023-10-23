import { encodeFunctionData } from 'viem';
import { Address, Hex } from '../../types';
import { BALANCER_RELAYER, NATIVE_ASSETS } from '../../utils';
import { Relayer } from '../relayer';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi } from '../../abi';
import {
    NestedProportionalExitInput,
    NestedSingleTokenExitInput,
    NestedExitQueryResult,
    NestedExitCallInput,
} from './types';
import { NestedPoolState } from '../types';
import { doQueryNestedExit } from './doQueryNestedExit';
import { getQueryCallsAttributes } from './getQueryCallsAttributes';
import { encodeCalls } from './encodeCalls';
import { getPeekCalls } from './getPeekCalls';
import { Token } from '../token';

export class NestedExit {
    async query(
        input: NestedProportionalExitInput | NestedSingleTokenExitInput,
        nestedPoolState: NestedPoolState,
    ): Promise<NestedExitQueryResult> {
        const isProportional = validateInputs(input, nestedPoolState);

        const { callsAttributes, bptAmountIn } = getQueryCallsAttributes(
            input,
            nestedPoolState,
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

        const peekedValues = await doQueryNestedExit(
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

    buildCall(input: NestedExitCallInput): {
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

const validateInputs = (
    input: NestedProportionalExitInput | NestedSingleTokenExitInput,
    nestedPoolState: NestedPoolState,
) => {
    const tokenOut = 'tokenOut' in input ? input.tokenOut : undefined;
    const isProportional = tokenOut === undefined;
    const mainTokens = nestedPoolState.mainTokens.map(
        (token) => new Token(input.chainId, token.address, token.decimals),
    );
    if (tokenOut && !mainTokens.some((t) => t.isSameAddress(tokenOut))) {
        throw new Error(
            `Exiting to ${tokenOut} requires it to exist within main tokens`,
        );
    }
    if (
        input.useNativeAssetAsWrappedAmountOut &&
        !mainTokens.some((t) =>
            t.isUnderlyingEqual(NATIVE_ASSETS[input.chainId]),
        )
    ) {
        throw new Error(
            'Exiting to native asset requires wrapped native asset to exist within main tokens',
        );
    }
    return isProportional;
};
