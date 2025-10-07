import {
    decodeAbiParameters,
    decodeFunctionResult,
    encodeFunctionData,
    zeroAddress,
    Address,
    Hex,
} from 'viem';
import { TokenAmount } from '../../../../tokenAmount';
import { BALANCER_RELAYER, ChainId, EMPTY_SENDER } from '@/utils';
import { balancerRelayerAbiExtended } from '@/abi';
import { Relayer } from '@/entities/relayer';
import { auraBalToken, balWethAddress, auraBAL } from './constants';
import { encodeJoinData } from './joinPool';
import { encodeSwapData } from './swap';
import { AuraBalSwapQueryOutput, AuraBalSwapQueryInput } from './types';
import { BaseToken } from '@/entities/baseToken';

// token[join]8020BPT[swap]auraBAL
export async function queryJoinSwap(
    input: AuraBalSwapQueryInput & { client },
): Promise<AuraBalSwapQueryOutput> {
    const { swapToken: joinToken, inputAmount, kind, client } = input;
    const value = 0n;

    // join BAL-WETH 80/20 Pool with joinToken and get 8020BPT in return
    const { joinPoolData, joinPoolOpRef } = encodeJoinData(
        joinToken,
        zeroAddress, // Note zeroAddress used for query but not for build
        inputAmount.amount,
        false, // for query we always use WETH
    );

    // swap 8020BPT>aurABL through auraBal/8020BPT stable pool
    // For query we set limit to 0
    const { swapData, swapOpRef } = encodeSwapData(
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
        abi: balancerRelayerAbiExtended,
        functionName: 'vaultActionsQueryMulticall',
        args: [[joinPoolData, swapData, peekData]],
    });

    const { data } = await client.call({
        ...EMPTY_SENDER,
        to: BALANCER_RELAYER[ChainId.MAINNET],
        data: encodedMulticall,
    });

    const result = decodeFunctionResult({
        abi: balancerRelayerAbiExtended,
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
    joinToken: BaseToken,
    wethIsEth: boolean,
    relayerApprovalSignature?: Hex,
): { callData: Hex; value: bigint } {
    // join BAL-WETH 80/20 Pool with joinToken and get 8020BPT in return (to the RELAYER)
    const { joinPoolData, joinPoolOpRef, value } = encodeJoinData(
        joinToken,
        userAddress,
        inputAmount,
        wethIsEth,
    );

    // Older pools don't have pre-approval so need to add this as a step, approves Vault to spend on RELAYERS behalf
    const approval = Relayer.encodeApproveVault(balWethAddress, joinPoolOpRef);

    // swap 8020BPT>auraBAL through auraBal/8020BPT stable pool
    // swap sends from the RELAYER to the user
    // swap is last action so uses limit defined with user slippage
    const { swapData } = encodeSwapData(
        joinPoolOpRef,
        balWethAddress,
        auraBAL as Address,
        BALANCER_RELAYER[ChainId.MAINNET],
        userAddress,
        swapLimit,
        0n, // always 0 value
        true,
    );

    const encodedCalls = [joinPoolData, approval, swapData];

    // prepend relayer approval if provided
    if (relayerApprovalSignature !== undefined) {
        encodedCalls.unshift(
            Relayer.encodeSetRelayerApproval(
                BALANCER_RELAYER[ChainId.MAINNET],
                true,
                relayerApprovalSignature,
            ),
        );
    }

    const encodedMulticall = encodeFunctionData({
        abi: balancerRelayerAbiExtended,
        functionName: 'multicall',
        args: [encodedCalls],
    });

    return { callData: encodedMulticall, value };
}
