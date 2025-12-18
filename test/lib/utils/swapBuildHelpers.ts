import {
    Swap,
    Slippage,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    Permit2,
} from '@/index';
import { Address } from 'viem';
import { serializeCallData } from './swapTestDataHelpers';

/**
 * Builds swap call data and serializes it for comparison/saving.
 * @param swap - The Swap instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param deadline - Transaction deadline
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @param sender - Optional sender address (required for V2 swaps)
 * @param recipient - Optional recipient address (required for V2 swaps)
 * @returns The built call and its serialized form
 */
export function buildAndSerializeCall(
    swap: Swap,
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput,
    slippage: Slippage,
    deadline: bigint,
    wethIsEth: boolean,
    sender?: Address,
    recipient?: Address,
): {
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    serializedCall: unknown;
} {
    const baseInput = {
        slippage,
        deadline,
        queryOutput,
        wethIsEth,
    };

    // V2 swaps require sender and recipient
    if (swap.protocolVersion === 2) {
        if (!sender || !recipient) {
            throw new Error(
                'V2 swaps require sender and recipient addresses to be provided',
            );
        }
        const call = swap.buildCall({
            ...baseInput,
            sender,
            recipient,
        });
        const serializedCall = serializeCallData(call);
        return { call, serializedCall };
    }

    const call = swap.buildCall(baseInput);

    const serializedCall = serializeCallData(call);

    return { call, serializedCall };
}

/**
 * Builds swap call data with Permit2 and serializes it for comparison/saving.
 * @param swap - The Swap instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param deadline - Transaction deadline
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @param permit2 - The Permit2 signature
 * @returns The built call and its serialized form
 */
export function buildAndSerializeCallWithPermit2(
    swap: Swap,
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput,
    slippage: Slippage,
    deadline: bigint,
    wethIsEth: boolean,
    permit2: Permit2,
): {
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    serializedCall: unknown;
} {
    const call = swap.buildCallWithPermit2(
        {
            slippage,
            deadline,
            queryOutput,
            wethIsEth,
        },
        permit2,
    );

    const serializedCall = serializeCallData(call);

    return { call, serializedCall };
}
