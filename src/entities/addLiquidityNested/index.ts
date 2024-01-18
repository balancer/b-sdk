import { encodeFunctionData } from 'viem';
import { Address, Hex } from '../../types';
import { Token } from '../token';
import { BALANCER_RELAYER } from '../../utils';
import { Relayer } from '../relayer';
import { encodeCalls } from './encodeCalls';
import { TokenAmount } from '../tokenAmount';
import { balancerRelayerAbi } from '../../abi';
import {
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutput,
    AddLiquidityNestedCallInput,
} from './types';
import { doAddLiquidityNestedQuery } from './doAddLiquidityNestedQuery';
import { getQueryCallsAttributes } from './getQueryCallsAttributes';
import { validateInputs } from './validateInputs';
import { NestedPoolState } from '../types';

export class AddLiquidityNested {
    async query(
        input: AddLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
    ): Promise<AddLiquidityNestedQueryOutput> {
        const amountsIn = validateInputs(input, nestedPoolState);

        const callsAttributes = getQueryCallsAttributes(
            input,
            nestedPoolState.pools,
        );

        const { encodedCalls } = encodeCalls(callsAttributes);

        // append peek call to get bptOut
        const peekCall = Relayer.encodePeekChainedReferenceValue(
            callsAttributes[callsAttributes.length - 1].outputReference,
        );
        encodedCalls.push(peekCall);

        const encodedMulticall = encodeFunctionData({
            abi: balancerRelayerAbi,
            functionName: 'vaultActionsQueryMulticall',
            args: [encodedCalls],
        });

        const peekedValue = await doAddLiquidityNestedQuery(
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

    buildCall(input: AddLiquidityNestedCallInput): {
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
