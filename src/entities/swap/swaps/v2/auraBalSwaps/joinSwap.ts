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
import { auraBalToken, balWethAddress, auraBAL } from './constants';
import { getJoinData } from './joinPool';
import { getSwapData } from './swap';
import { AuraBalSwapQueryOutput } from './auraBalSwaps';
import { Token } from '@/entities/token';
import { AuraBalSwapQueryInput } from './parseInputs';

// token[join]8020BPT[swap]auraBAL
export async function queryJoinSwap(
    input: AuraBalSwapQueryInput & { client },
): Promise<AuraBalSwapQueryOutput> {
    const { swapToken: joinToken, inputAmount, kind, client } = input;
    const value = 0n;

    // join BAL-WETH 80/20 Pool with joinToken and get 8020BPT in return
    const { joinPoolData, joinPoolOpRef } = getJoinData(
        joinToken,
        zeroAddress, // Note zeroAddress used for query but not for build
        inputAmount.amount,
        value,
    );

    // swap 8020BPT>aurABL through auraBal/8020BPT stable pool
    // For query we set limit to 0
    const { swapData, swapOpRef } = getSwapData(
        joinPoolOpRef,
        balWethAddress,
        auraBAL as Address,
        zeroAddress,
        zeroAddress,
        0n,
        value,
        true,
    );

    // peek call is used to read final result
    const peekData = Relayer.encodePeekChainedReferenceValue(swapOpRef);

    // vaultActionsQueryMulticall allows us to query even if user has no balance/allowance
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
    userAddress: Address,
    inputAmount: bigint,
    swapLimit: bigint,
    joinToken: Token,
    relayerApprovalSignature?: Hex,
): Hex {
    const value = 0n;

    // join BAL-WETH 80/20 Pool with joinToken and get 8020BPT in return (to the RELAYER)
    const { joinPoolData, joinPoolOpRef } = getJoinData(
        joinToken,
        userAddress,
        inputAmount,
        value,
    );

    // Older pools don't have pre-approval so need to add this as a step, approves Vault to spend on RELAYERS behalf
    const approval = Relayer.encodeApproveVault(balWethAddress, joinPoolOpRef);

    // swap 8020BPT>aurABL through auraBal/8020BPT stable pool
    // swap sends from the RELAYER to the user
    // swap is last action so uses limit defined with user slippage
    const { swapData } = getSwapData(
        joinPoolOpRef,
        balWethAddress,
        auraBAL as Address,
        BALANCER_RELAYER[1],
        userAddress,
        swapLimit,
        value,
        true,
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
