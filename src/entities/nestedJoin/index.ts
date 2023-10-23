import { encodeFunctionData } from 'viem';
import { Address, Hex } from '../../types';
import { Token } from '../token';
import { BALANCER_RELAYER } from '../../utils';
import { Relayer } from '../relayer';
import { encodeCalls } from './encodeCalls';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi } from '../../abi';
import {
    NestedJoinInput,
    NestedJoinQueryResult,
    NestedJoinCallInput,
} from './types';
import { getQueryCallsAttributes } from './getQueryCallsAttributes';
import { doQueryNestedJoin } from './doQueryNestedJoin';
import { NestedPoolState } from '../types';

export class NestedJoin {
    async query(
        input: NestedJoinInput,
        nestedPoolState: NestedPoolState,
    ): Promise<NestedJoinQueryResult> {
        const nestedTokens = [
            ...new Set(
                nestedPoolState.pools
                    .flatMap((p) => p.tokens)
                    .map(
                        (t) => new Token(input.chainId, t.address, t.decimals),
                    ),
            ),
        ];

        const amountsIn = input.amountsIn.map((amountIn) => {
            const tokenIn = nestedTokens.find((t) =>
                t.isSameAddress(amountIn.address),
            );
            if (tokenIn === undefined) {
                throw new Error(
                    `Token ${amountIn.address} not found in nested pool`,
                );
            }
            return TokenAmount.fromRawAmount(tokenIn, amountIn.rawAmount);
        });

        const callsAttributes = getQueryCallsAttributes(input, nestedPoolState);

        const { encodedCalls } = encodeCalls(callsAttributes);

        // append peek call to get bptOut
        const peekCall = Relayer.encodePeekChainedReferenceValue(
            Relayer.toChainedReference(
                callsAttributes[callsAttributes.length - 1].outputReferenceKey,
            ),
        );
        encodedCalls.push(peekCall);

        const encodedMulticall = encodeFunctionData({
            abi: balancerRelayerAbi,
            functionName: 'vaultActionsQueryMulticall',
            args: [encodedCalls],
        });

        const peekedValue = await doQueryNestedJoin(
            input.chainId,
            input.rpcUrl,
            input.accountAddress,
            encodedMulticall,
        );

        const tokenOut = new Token(
            input.chainId,
            callsAttributes[callsAttributes.length - 1].poolAddress,
            18,
        );
        const bptOut = TokenAmount.fromRawAmount(tokenOut, peekedValue);

        return { callsAttributes, amountsIn, bptOut };
    }

    buildCall(input: NestedJoinCallInput): {
        call: Hex;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
    } {
        // apply slippage to bptOut
        const minBptOut = input.slippage.removeFrom(input.bptOut.amount);

        // update last call with minBptOut limit in place
        input.callsAttributes[input.callsAttributes.length - 1] = {
            ...input.callsAttributes[input.callsAttributes.length - 1],
            minBptOut,
        };

        const { encodedCalls, values } = encodeCalls(input.callsAttributes);

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

        // aggregate values from all calls
        const accumulatedValue = values.reduce((acc, value) => {
            return acc + value;
        }, 0n);

        return {
            call,
            to: BALANCER_RELAYER[input.callsAttributes[0].chainId],
            value: accumulatedValue,
            minBptOut,
        };
    }
}
