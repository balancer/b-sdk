import { encodeFunctionData } from 'viem';
import { Address, Hex } from '../../types';
import { Token } from '../token';
import { BALANCER_RELAYER, getPoolAddress } from '../../utils';
import { Relayer } from '../relayer';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi, bathcRelayerLibraryAbi } from '../../abi';
import {
    NestedExitInput,
    NestedExitQueryResult,
    NestedExitCallInput,
} from './types';
import { NestedPoolState } from '../types';
import { doQueryNestedExit } from './doQueryNestedExit';
import { getNestedExitCalls } from './getNestedExitCalls';
import { parseNestedExitCall } from './parseNestedExitCall';

export class NestedExit {
    async query(
        input: NestedExitInput,
        nestedPoolState: NestedPoolState,
    ): Promise<NestedExitQueryResult> {
        const { calls, bptAmountIn } = getNestedExitCalls(
            input,
            nestedPoolState,
        );

        const parsedCalls = calls.map((call) => parseNestedExitCall(call));

        const encodedCalls = parsedCalls.map((parsedCall) =>
            encodeFunctionData({
                abi: bathcRelayerLibraryAbi,
                functionName: 'exitPool',
                args: parsedCall.args,
            }),
        );

        const tokensOut: Token[] = [];
        const peekCalls: Hex[] = [];
        calls.forEach((call) => {
            call.outputReferenceKeys.forEach((opRefKey) => {
                const tokenOut = call.sortedTokens[Number(opRefKey % 10n)];
                const isTokenBeingUsedAsInput = calls.some(
                    (_call) =>
                        _call.bptAmountIn.isRef === true &&
                        tokenOut.isSameAddress(getPoolAddress(_call.poolId)),
                );

                if (!isTokenBeingUsedAsInput) {
                    tokensOut.push(tokenOut);
                    peekCalls.push(
                        Relayer.encodePeekChainedReferenceValue(
                            Relayer.toChainedReference(opRefKey, false),
                        ),
                    );
                }
            });
        });

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

        return { calls, bptAmountIn, amountsOut };
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

        input.calls.forEach((call) => {
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

            // remove output reference key related to bpt token if present
            // TODO: check why query/peek logic needs it
            call.outputReferenceKeys = call.outputReferenceKeys.filter(
                (_, i) => {
                    const token = call.sortedTokens[i];
                    const isBptToken = token.isSameAddress(
                        getPoolAddress(call.poolId),
                    );
                    return !isBptToken;
                },
            );
        });

        const parsedCalls = input.calls.map((call) =>
            parseNestedExitCall(call),
        );

        const encodedCalls = parsedCalls.map((parsedCall) =>
            encodeFunctionData({
                abi: bathcRelayerLibraryAbi,
                functionName: 'exitPool',
                args: parsedCall.args,
            }),
        );

        // prepend relayer approval if provided
        if (input.relayerApprovalSignature !== undefined) {
            encodedCalls.unshift(
                Relayer.encodeSetRelayerApproval(
                    BALANCER_RELAYER[input.chainId],
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
            to: BALANCER_RELAYER[input.chainId],
            minAmountsOut,
        };
    }
}
