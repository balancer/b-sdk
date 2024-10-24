import { encodeFunctionData } from 'viem';
import { Token } from '../../token';
import { BALANCER_RELAYER, ZERO_ADDRESS } from '../../../utils';
import { Relayer } from '../../relayer';
import { encodeCalls } from './encodeCalls';
import { TokenAmount } from '../../tokenAmount';
import { balancerRelayerAbi } from '../../../abi';
import { doAddLiquidityNestedQuery } from './doAddLiquidityNestedQuery';
import { getQueryCallsAttributes } from './getQueryCallsAttributes';
import { validateBuildCallInput, validateQueryInput } from './validateInputs';
import { NestedPoolState } from '../../types';
import {
    AddLiquidityNestedBuildCallOutput,
    AddLiquidityNestedInput,
} from '../types';
import {
    AddLiquidityNestedCallInputV2,
    AddLiquidityNestedQueryOutputV2,
} from './types';

export class AddLiquidityNestedV2 {
    async query(
        input: AddLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
    ): Promise<AddLiquidityNestedQueryOutputV2> {
        const amountsIn = validateQueryInput(input, nestedPoolState);

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
            encodedMulticall,
        );

        const tokenOut = new Token(
            input.chainId,
            callsAttributes[callsAttributes.length - 1].poolAddress,
            18,
        );
        const bptOut = TokenAmount.fromRawAmount(tokenOut, peekedValue);

        return { callsAttributes, amountsIn, bptOut, protocolVersion: 2 };
    }

    buildCall(
        input: AddLiquidityNestedCallInputV2,
    ): AddLiquidityNestedBuildCallOutput {
        validateBuildCallInput(input);
        // apply slippage to bptOut
        const minBptOut = input.slippage.applyTo(input.bptOut.amount, -1);

        // update last call with minBptOut limit in place
        input.callsAttributes[input.callsAttributes.length - 1] = {
            ...input.callsAttributes[input.callsAttributes.length - 1],
            minBptOut,
        };

        // update wethIsEth flag + sender and recipient placeholders
        input.callsAttributes = input.callsAttributes.map((call) => {
            return {
                ...call,
                sender:
                    call.sender === ZERO_ADDRESS
                        ? input.accountAddress
                        : call.sender,
                recipient:
                    call.recipient === ZERO_ADDRESS
                        ? input.accountAddress
                        : call.recipient,
                wethIsEth: input.wethIsEth,
            };
        });

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

        const callData = encodeFunctionData({
            abi: balancerRelayerAbi,
            functionName: 'multicall',
            args: [encodedCalls],
        });

        // aggregate values from all calls
        const accumulatedValue = values.reduce((acc, value) => {
            return acc + value;
        }, 0n);

        return {
            callData,
            to: BALANCER_RELAYER[input.callsAttributes[0].chainId],
            value: accumulatedValue,
            minBptOut,
        };
    }
}
