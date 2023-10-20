import { encodeFunctionData } from 'viem';
import { Address, Hex } from '../../types';
import { Token } from '../token';
import { BALANCER_RELAYER, getPoolAddress } from '../../utils';
import { Relayer } from '../relayer';
import { parseNestedJoinCall } from './parseNestedJoinCall';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi, bathcRelayerLibraryAbi } from '../../abi';
import {
    NestedJoinInput,
    NestedJoinQueryResult,
    NestedJoinCallInput,
} from './types';
import { getNestedJoinCalls } from './getNestedJoinCalls';
import { doQueryNestedJoin } from './doQueryNestedJoin';
import { NestedPoolState } from '../types';

export class NestedJoin {
    async query(
        input: NestedJoinInput,
        nestedPoolState: NestedPoolState,
    ): Promise<NestedJoinQueryResult> {
        const calls = getNestedJoinCalls(input, nestedPoolState);

        const parsedCalls = calls.map((call) => parseNestedJoinCall(call));

        const encodedCalls = parsedCalls.map((parsedCall) =>
            encodeFunctionData({
                abi: bathcRelayerLibraryAbi,
                functionName: 'joinPool',
                args: parsedCall.args,
            }),
        );

        // append peek call to get bptOut
        const peekCall = Relayer.encodePeekChainedReferenceValue(
            Relayer.toChainedReference(
                calls[calls.length - 1].outputReferenceKey,
                false,
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
            getPoolAddress(calls[calls.length - 1].poolId),
            18,
        );
        const bptOut = TokenAmount.fromRawAmount(tokenOut, peekedValue);

        return { calls, bptOut };
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
        input.calls[input.calls.length - 1] = {
            ...input.calls[input.calls.length - 1],
            minBptOut,
        };

        const parsedCalls = input.calls.map((call) =>
            parseNestedJoinCall(call),
        );

        const encodedCalls = parsedCalls.map((parsedCall) =>
            encodeFunctionData({
                abi: bathcRelayerLibraryAbi,
                functionName: 'joinPool',
                args: parsedCall.args,
            }),
        );

        // prepend relayer approval if provided
        if (input.relayerApprovalSignature !== undefined) {
            encodedCalls.unshift(
                Relayer.encodeSetRelayerApproval(
                    BALANCER_RELAYER[input.calls[0].chainId],
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

        // get aggregated value from parsedCalls
        const accumulatedValue = parsedCalls.reduce((acc, parsedCall) => {
            return acc + parsedCall.value;
        }, 0n);

        return {
            call,
            to: BALANCER_RELAYER[input.calls[0].chainId],
            value: accumulatedValue,
            minBptOut,
        };
    }
}
