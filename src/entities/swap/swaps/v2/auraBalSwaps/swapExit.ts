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
import { getSwapData } from './swap';
import { AuraBalSwapQueryOutput } from './auraBalSwaps';
import { Token } from '@/entities/token';
import { getExitData } from './exitPool';
import { AuraBalSwapQueryInput } from './parseInputs';

// auraBal[swap]8020Bpt[exit]token
export async function querySwapExit(
    input: AuraBalSwapQueryInput & { client },
): Promise<AuraBalSwapQueryOutput> {
    const { swapToken: exitToken, inputAmount, kind, client } = input;
    const value = 0n;

    // swap aurABL>8020BPT through auraBal/8020BPT stable pool
    const { swapData, swapOpRef } = getSwapData(
        inputAmount.amount,
        auraBAL as Address,
        balWethAddress,
        zeroAddress, // Note zeroAddress used for query but not for build
        zeroAddress,
        0n,
        value,
        true,
    );

    // exit BAL-WETH 80/20 Pool to exitToken
    // For query we set limit to 0
    const { exitPoolData, exitPoolOpRef } = getExitData(
        exitToken,
        zeroAddress, // Note zeroAddress used for query but not for build
        swapOpRef,
        0n,
        false, // always use weth for query
    );

    // peek call is used to read final result
    const peekData = Relayer.encodePeekChainedReferenceValue(exitPoolOpRef);

    // vaultActionsQueryMulticall allows us to query even if user has no balance/allowance
    const encodedMulticall = encodeFunctionData({
        abi: balancerRelayerAbi,
        functionName: 'vaultActionsQueryMulticall',
        args: [[swapData, exitPoolData, peekData]],
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
        inputAmount: TokenAmount.fromRawAmount(
            auraBalToken,
            inputAmount.amount,
        ),
        expectedAmountOut: TokenAmount.fromRawAmount(exitToken, peekedValue),
        kind,
    };
}

export function buildSwapExitCall(
    user: Address,
    inputAmount: bigint,
    exitLimit: bigint,
    exitToken: Token,
    wethIsEth: boolean,
    relayerApprovalSignature?: Hex,
): Hex {
    const value = 0n;

    // swap aurABL>8020BPT through auraBal/8020BPT stable pool
    // swap sends from the user to the RELAYER.
    // swap limit as 0 because swap is first step (unsafe otherwise)
    // opRef must be non-temp so approval and exit can use it
    const { swapData, swapOpRef } = getSwapData(
        inputAmount,
        auraBAL as Address,
        balWethAddress,
        user,
        BALANCER_RELAYER[1],
        0n,
        value,
        false,
    );

    // Older pools don't have pre-approval so need to add this as a step
    const approval = Relayer.encodeApproveVault(balWethAddress, swapOpRef);

    // exit BAL-WETH 80/20 Pool to exitToken
    // exit is last action so uses limit defined with user slippage
    const { exitPoolData } = getExitData(
        exitToken,
        user,
        swapOpRef,
        exitLimit,
        wethIsEth,
    );

    const encodedCalls = [swapData, approval, exitPoolData];

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
