import {
    decodeAbiParameters,
    decodeFunctionResult,
    encodeFunctionData,
    zeroAddress,
    Address,
    Hex,
} from 'viem';
import { TokenAmount } from '../../../../tokenAmount';
import { BALANCER_RELAYER } from '@/utils';
import { balancerRelayerAbi } from '@/abi';
import { Relayer } from '@/entities/relayer';
import { auraBalToken, balWethAddress } from './constants';
import { getJoinData } from './joinPool';
import { getSwapData } from './swap';
import { AuraBalSwapQueryInput, AuraBalSwapQueryOutput } from './auraBalSwaps';
import { Token } from '@/entities/token';

export async function queryJoinSwap(
    input: AuraBalSwapQueryInput & { client },
): Promise<AuraBalSwapQueryOutput> {
    const { swapToken: joinToken, inputAmount, kind, client } = input;
    const value = 0n;

    const { joinPoolData, joinPoolOpRef } = getJoinData(
        joinToken,
        zeroAddress, // Note zeroAddress used for query but not for build
        inputAmount.amount,
        value,
    );

    // For query we set limit to 0
    const { swapData, swapOpRef } = getSwapData(
        joinPoolOpRef,
        zeroAddress,
        zeroAddress,
        0n,
        value,
    );

    // peek call is used to read final result
    const peekData = Relayer.encodePeekChainedReferenceValue(swapOpRef);

    const encodedMulticall = encodeFunctionData({
        abi: balancerRelayerAbi,
        functionName: 'vaultActionsQueryMulticall',
        args: [[joinPoolData, swapData, peekData]],
    });

    const { data } = await client.call({
        to: BALANCER_RELAYER[1],
        data: encodedMulticall,
    });

    const result = decodeFunctionResult({
        abi: balancerRelayerAbi,
        functionName: 'vaultActionsQueryMulticall',
        data: data as Hex,
    });

    const peekedValue = decodeAbiParameters(
        [{ type: 'uint256' }],
        result[result.length - 1],
    )[0];
    return {
        inputAmount: TokenAmount.fromRawAmount(joinToken, inputAmount.amount),
        expectedAmountOut: TokenAmount.fromRawAmount(auraBalToken, peekedValue),
        kind,
    };
}

export function buildJoinSwapCall(
    user: Address,
    inputAmount: bigint,
    swapLimit: bigint,
    joinToken: Token,
    relayerApprovalSignature?: Hex,
): Hex {
    const value = 0n;

    const { joinPoolData, joinPoolOpRef } = getJoinData(
        joinToken,
        user,
        inputAmount,
        value,
    );

    // Older pools don't have pre-approval so need to add this as a step
    const approval = Relayer.encodeApproveVault(balWethAddress, joinPoolOpRef);

    // Swap sends from the Relayer to the user
    const { swapData } = getSwapData(
        joinPoolOpRef,
        BALANCER_RELAYER[1],
        user,
        swapLimit,
        value,
    );

    const encodedCalls = [joinPoolData, approval, swapData];
    // prepend relayer approval if provided
    if (relayerApprovalSignature !== undefined) {
        encodedCalls.unshift(
            Relayer.encodeSetRelayerApproval(
                BALANCER_RELAYER[1],
                true,
                relayerApprovalSignature,
            ),
        );
    }

    const encodedMulticall = encodeFunctionData({
        abi: balancerRelayerAbi,
        functionName: 'multicall',
        args: [encodedCalls],
    });

    return encodedMulticall;
}
